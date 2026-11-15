# SafeRoute AI — Computer Vision / AI Service

Offline-first traffic camera analysis. Produces vehicle detections, congestion
levels, and incident hints that the FastAPI backend ingests over WebSocket /
REST.

## Run

```bash
cd ai
pip install -r requirements.txt
python - <<'PY'
from traffic_analyzer import TrafficAnalyzer
import cv2
analyzer = TrafficAnalyzer()
cap = cv2.VideoCapture("traffic_camera.mp4")  # or 0 for webcam / RTSP url
while True:
    ok, frame = cap.read()
    if not ok:
        break
    analysis = analyzer.analyze_frame(frame)
    print(analysis.model_dump_json())
PY
```

## Notes

- With `ultralytics` + a YOLO weights file configured in `model_config.yaml`, the
  service classifies vehicles (car/truck/bus/motorcycle/emergency) and tracks them.
- Without weights it falls back to OpenCV background subtraction — motion is
  detected but not classified. This is clearly labelled `opencv_fallback`.
- Coordinates produced here are pixel-space detections; the backend maps them
  to road segments via OSRM/Turf. Never fabricate GPS coordinates.
