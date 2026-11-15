"""Road-constrained traffic simulation service (backend side)."""

import asyncio
import math
import random
import uuid
from typing import Dict, List

from geoalchemy2 import WKTElement
from sqlalchemy import select

from ..database import AsyncSessionLocal
from .. import models


def _haversine_m(lat1, lon1, lat2, lon2):
    to_rad = math.radians
    R = 6371000.0
    p1, p2 = to_rad(lat1), to_rad(lat2)
    dp = to_rad(lat2 - lat1)
    dl = to_rad(lon2 - lon1)
    h = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * R * math.asin(math.sqrt(h))


def _line_length_m(coords):
    total = 0.0
    for i in range(1, len(coords)):
        lon1, lat1 = coords[i - 1]
        lon2, lat2 = coords[i]
        total += _haversine_m(lat1, lon1, lat2, lon2)
    return total


def _bearing(p1, p2):
    lon1, lat1 = p1
    lon2, lat2 = p2
    to_rad = math.radians
    phi1, phi2 = to_rad(lat1), to_rad(lat2)
    dl = to_rad(lon2 - lon1)
    y = math.sin(dl) * math.cos(phi2)
    x = math.cos(phi1) * math.sin(phi2) - math.sin(phi1) * math.cos(phi2) * math.cos(dl)
    brg = (math.degrees(math.atan2(y, x)) + 360) % 360
    return brg


class SimulationService:
    """Advances simulation vehicles along real road geometry and broadcasts
    updates over WebSockets. All data is explicitly labelled 'simulation'."""

    def __init__(self, manager):
        self.manager = manager
        self.running = False
        self.task: asyncio.Task | None = None
        self.vehicles: Dict[str, dict] = {}
        self.roads: Dict[str, dict] = {}
        self.tick_interval = 1.0
        self.road_index: Dict[str, dict] = {}

    async def start(self, vehicle_count: int = 60):
        if self.running:
            return
        self.running = True
        await self._load_roads()
        self._spawn_vehicles(vehicle_count)
        self.task = asyncio.create_task(self._loop())

    async def stop(self):
        self.running = False
        if self.task:
            self.task.cancel()
            try:
                await self.task
            except asyncio.CancelledError:
                pass
            self.task = None

    async def _load_roads(self):
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(models.RoadSegment))
            for r in result.scalars().all():
                wkt = r.geometry.wkt if hasattr(r.geometry, "wkt") else None
                coords = self._parse_wkt_linestring(wkt) if wkt else []
                self.roads[r.id] = {
                    "id": r.id,
                    "name": r.name,
                    "type": r.type,
                    "coordinates": coords,
                    "congestion": r.congestion,
                }

    @staticmethod
    def _parse_wkt_linestring(wkt: str):
        inner = wkt.split("(", 1)[1].rsplit(")", 1)[0]
        pts = []
        for part in inner.split(","):
            part = part.strip()
            if not part:
                continue
            lon_s, lat_s = part.split()
            pts.append([float(lon_s), float(lat_s)])
        return pts

    def _spawn_vehicles(self, count: int):
        road_ids = list(self.roads.keys())
        if not road_ids:
            return
        cats = ["car", "bus", "car", "motorcycle", "truck", "ambulance", "police", "fire_engine"]
        for i in range(count):
            road = self.roads[road_ids[i % len(road_ids)]]
            start = road["coordinates"][0]
            cat = cats[i % len(cats)]
            is_emergency = cat in ("ambulance", "police", "fire_engine")
            self.vehicles[f"sim-{i+1}"] = {
                "id": f"sim-{i+1}",
                "category": cat,
                "label": f"{cat.upper()}-{1000+i}",
                "position": [start[0], start[1], 0.0],
                "heading": 0.0,
                "speed": 0.0,
                "data_source": "simulation",
                "is_emergency": is_emergency,
                "route_id": road["id"],
                "road_progress": 0.0,
            }

    async def _loop(self):
        while self.running:
            await self._tick()
            await asyncio.sleep(self.tick_interval)

    async def _tick(self):
        updates = []
        async with AsyncSessionLocal() as db:
            for vid, v in list(self.vehicles.items()):
                road = self.roads.get(v["route_id"])
                if not road:
                    continue
                coords = road["coordinates"]
                if len(coords) < 2:
                    continue
                length_m = _line_length_m(coords)
                speed_mps = (v["speed"] or 30) * (1000 / 3600)
                dist_m = speed_mps * self.tick_interval
                progress = min(1.0, (v["road_progress"] + dist_m / max(length_m, 1)))
                if progress >= 1.0:
                    progress = 0.0

                pt = self._interpolate(coords, progress)
                ahead = min(1.0, progress + 0.01)
                pt2 = self._interpolate(coords, ahead)
                heading = _bearing(pt, pt2)

                speed_kmh = 55 if v["is_emergency"] else (25 + random.random() * 15)

                v.update(
                    position=[pt[0], pt[1], 0.0],
                    heading=heading,
                    speed=speed_kmh,
                    road_progress=progress,
                )

                await self._upsert_vehicle(db, v)
                updates.append(
                    {
                        "id": v["id"],
                        "category": v["category"],
                        "label": v["label"],
                        "position": [pt[0], pt[1], 0.0],
                        "heading": heading,
                        "speed": speed_kmh,
                        "lastUpdate": v.get("last_update"),
                        "dataSource": "simulation",
                        "isEmergency": v["is_emergency"],
                    }
                )
            await db.commit()

        if updates:
            await self.manager.broadcast(
                {"type": "vehicle_update_batch", "payload": updates}
            )

    @staticmethod
    def _interpolate(coords, progress):
        segs = []
        total = 0.0
        for i in range(1, len(coords)):
            lon1, lat1 = coords[i - 1]
            lon2, lat2 = coords[i]
            d = _haversine_m(lat1, lon1, lat2, lon2)
            segs.append((coords[i - 1], coords[i], d, total))
            total += d
        target = progress * total
        for (a, b, d, cum) in segs:
            if target <= cum + d:
                t = (target - cum) / d if d > 0 else 0
                return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
        return coords[-1]

    async def _upsert_vehicle(self, db, v):
        from sqlalchemy import select as sa_select
        result = await db.execute(
            sa_select(models.Vehicle).where(models.Vehicle.id == v["id"])
        )
        existing = result.scalar_one_or_none()
        wkt = f"POINT({v['position'][0]} {v['position'][1]})"
        if existing:
            existing.lon = v["position"][0]
            existing.lat = v["position"][1]
            existing.heading = v["heading"]
            existing.speed = v["speed"]
            existing.data_source = "simulation"
            existing.is_emergency = v["is_emergency"]
            existing.route_id = v["route_id"]
            existing.road_progress = v["road_progress"]
            existing.position = WKTElement(wkt, srid=4326)
        else:
            db.add(
                models.Vehicle(
                    id=v["id"],
                    category=v["category"],
                    label=v["label"],
                    lon=v["position"][0],
                    lat=v["position"][1],
                    heading=v["heading"],
                    speed=v["speed"],
                    data_source="simulation",
                    is_emergency=v["is_emergency"],
                    route_id=v["route_id"],
                    road_progress=v["road_progress"],
                    position=WKTElement(wkt, srid=4326),
                )
            )

