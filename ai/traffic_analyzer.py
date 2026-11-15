"""SafeRoute AI traffic analysis service.

Wraps YOLO (when ultralytics + weights are available) with an OpenCV
background-subtraction fallback. Every inference is deterministic and can be
run offline on a traffic camera RTSP stream or a recorded file.

Output is intentionally schema-strict so the FastAPI backend can ingest it
over WebSocket / REST without fabricating coordinates.
"""

from __future__ import annotations

import math
import time
from dataclasses import dataclass, field
from typing import List, Optional, Tuple

import cv2
import numpy as np
from pydantic import BaseModel, ConfigDict


class Detection(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    x1: float
    y1: float
    x2: float
    y2: float
    confidence: float
    class_id: int
    class_name: str
    track_id: Optional[int] = None


class FrameAnalysis(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    timestamp: float
    frame_id: int
    vehicle_count: int
    by_class: dict = {}
    detections: List[Detection] = []
    congestion_level: str = "unknown"   # low | moderate | heavy | severe | unknown
    estimated_speed_kmh: Optional[float] = None
    incident: Optional[dict] = None     # {type, severity, description}
    source: str = "opencv_fallback"     # yolov8 | opencv_fallback


@dataclass
class _Track:
    track_id: int
    bbox: Tuple[float, float, float, float]
    class_name: str
    hits: int = 1
    age: int = 0
    last_seen: float = 0.0
    centroid_history: List[Tuple[float, float]] = field(default_factory=list)


class TrafficAnalyzer:
    def __init__(self, config: dict | None = None):
        self.config = config or {}
        self.model = None
        self.framework = self.config.get("framework", "fallback")
        self.confidence = float(self.config.get("confidence", 0.35))
        self.iou_threshold = float(self.config.get("iou_threshold", 0.45))
        self.class_names: List[str] = list(self.config.get("classes", ["car"]))
        self.fps = float(self.config.get("fps", 15))

        self._tracks: dict[int, _Track] = {}
        self._next_track_id = 1
        self._frame_id = 0
        self._bg_subtractor = cv2.createBackgroundSubtractorMOG2(
            history=500, varThreshold=40, detectShadows=True
        )
        self._prev_frame_id = 0
        self._prev_avg_speed = None

        self._load_model()

    def _load_model(self):
        """Attempt to load YOLO via ultralytics; fall back to OpenCV."""
        weights = self.config.get("weights")
        if self.framework == "ultralytics" and weights:
            try:
                from ultralytics import YOLO  # type: ignore
                self.model = YOLO(weights)
                self.framework = "ultralytics"
                print(f"[traffic_analyzer] YOLO loaded: {weights}")
                return
            except Exception as exc:  # pragma: no cover - optional dep
                print(f"[traffic_analyzer] YOLO unavailable ({exc}); using OpenCV fallback")
        self.framework = "opencv_fallback"
        self.model = None

    # ------------------------------------------------------------------ #
    # Public API
    # ------------------------------------------------------------------ #
    def analyze_frame(self, frame: np.ndarray) -> FrameAnalysis:
        self._frame_id += 1
        if self.framework == "ultralytics" and self.model is not None:
            return self._analyze_yolo(frame)
        return self._analyze_opencv(frame)

    def _analyze_yolo(self, frame: np.ndarray) -> FrameAnalysis:
        results = self.model.track(
            frame,
            conf=self.confidence,
            iou=self.iou_threshold,
            persist=True,
            verbose=False,
        )
        detections: List[Detection] = []
        counts: dict = {}
        res = results[0]
        boxes = res.boxes
        if boxes is not None:
            for box in boxes:
                cls_id = int(box.cls[0])
                name = self.model.names.get(cls_id, str(cls_id))
                x1, y1, x2, y2 = [float(v) for v in box.xyxy[0]]
                conf = float(box.conf[0])
                track_id = int(box.id[0]) if box.id is not None else None
                detections.append(
                    Detection(
                        x1=x1,
                        y1=y1,
                        x2=x2,
                        y2=y2,
                        confidence=conf,
                        class_id=cls_id,
                        class_name=name,
                        track_id=track_id,
                    )
                )
                counts[name] = counts.get(name, 0) + 1
        total = len(detections)
        congestion = self._classify_congestion(total, None)
        return FrameAnalysis(
            timestamp=time.time(),
            frame_id=self._frame_id,
            vehicle_count=total,
            by_class=counts,
            detections=detections,
            congestion_level=congestion,
            source="yolov8",
        )

    def _analyze_opencv(self, frame: np.ndarray) -> FrameAnalysis:
        """Motion-based vehicle detection fallback (no classification)."""
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        gray = cv2.GaussianBlur(gray, (21, 21), 0)
        fg_mask = self._bg_subtractor.apply(gray)
        fg_mask = cv2.threshold(fg_mask, 200, 255, cv2.THRESH_BINARY)[1]
        fg_mask = cv2.dilate(fg_mask, None, iterations=2)
        contours, _ = cv2.findContours(
            fg_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )

        detections: List[Detection] = []
        h, w = frame.shape[:2]
        min_area = (w * h) * 0.002
        for cnt in contours:
            area = cv2.contourArea(cnt)
            if area < min_area:
                continue
            x, y, cw, ch = cv2.boundingRect(cnt)
            cx, cy = x + cw / 2, y + ch / 2
            track_id = self._match_track((cx, cy), (x, y, x + cw, y + ch), "vehicle")
            detections.append(
                Detection(
                    x1=float(x),
                    y1=float(y),
                    x2=float(x + cw),
                    y2=float(y + ch),
                    confidence=0.5,
                    class_id=0,
                    class_name="vehicle",
                    track_id=track_id,
                )
            )
        self._age_tracks()

        total = len(detections)
        speed_kmh = self._estimate_speed()
        congestion = self._classify_congestion(total, speed_kmh)

        incident = None
        if congestion == "severe":
            incident = {
                "type": "congestion",
                "severity": "medium",
                "description": "Severe congestion detected by camera feed.",
            }

        return FrameAnalysis(
            timestamp=time.time(),
            frame_id=self._frame_id,
            vehicle_count=total,
            by_class={"vehicle": total},
            detections=detections,
            congestion_level=congestion,
            estimated_speed_kmh=speed_kmh,
            incident=incident,
            source="opencv_fallback",
        )

    def _match_track(self, centroid, bbox, class_name):
        best_id = None
        best_dist = float("inf")
        for tid, tr in self._tracks.items():
            if tr.class_name != class_name:
                continue
            dx = centroid[0] - tr.centroid_history[-1][0]
            dy = centroid[1] - tr.centroid_history[-1][1]
            dist = math.hypot(dx, dy)
            if dist < best_dist and dist < 80:
                best_dist = dist
                best_id = tid
        if best_id is None:
            best_id = self._next_track_id
            self._next_track_id += 1
            self._tracks[best_id] = _Track(best_id, bbox, class_name)
        tr = self._tracks[best_id]
        tr.bbox = bbox
        tr.hits += 1
        tr.age = 0
        tr.last_seen = time.time()
        tr.centroid_history.append(centroid)
        if len(tr.centroid_history) > 10:
            tr.centroid_history.pop(0)
        return best_id

    def _age_tracks(self):
        dead = []
        for tid, tr in self._tracks.items():
            tr.age += 1
            if tr.age > int(self.config.get("max_age", 30)):
                dead.append(tid)
        for tid in dead:
            self._tracks.pop(tid, None)

    def _estimate_speed(self) -> Optional[float]:
        speeds = []
        scale_m_per_px = 0.05
        for tr in self._tracks.values():
            if len(tr.centroid_history) < 2:
                continue
            (x0, y0), (x1, y1) = tr.centroid_history[0], tr.centroid_history[-1]
            dist_px = math.hypot(x1 - x0, y1 - y0)
            dist_m = dist_px * scale_m_per_px
            kmh = (dist_m / 1000) * 3600
            speeds.append(kmh)
        if not speeds:
            return None
        avg = sum(speeds) / len(speeds)
        self._prev_avg_speed = avg
        return round(avg, 1)

    def _classify_congestion(self, count: int, speed: Optional[float]) -> str:
        cfg = self.config.get("congestion", {})
        low_max = int(cfg.get("low_max", 12))
        mod_max = int(cfg.get("moderate_max", 24))
        heavy_max = int(cfg.get("heavy_max", 40))
        if count >= heavy_max or (speed is not None and speed < 8):
            return "severe"
        if count >= mod_max or (speed is not None and speed < 20):
            return "heavy"
        if count >= low_max or (speed is not None and speed < 35):
            return "moderate"
        return "low"

