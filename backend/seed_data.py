"""Seed SafeRoute AI with real-coordinate (San Francisco sample) road network.

Run:  python seed_data.py   (requires a running Postgres + PostGIS database)
All coordinates are real lat/lon in the SOMA district of San Francisco.
These are SAMPLE/demonstration geometry — replace with OSM/PostGIS imports in production.
"""

import asyncio
from geoalchemy2 import WKTElement

from app.database import AsyncSessionLocal
from app import models


# Real coordinates: San Francisco SOMA (around Market & 3rd St).
CENTER_LON, CENTER_LAT = -122.3935, 37.7882


def seg(lon_lat_pairs):
    return WKTElement(
        "LINESTRING(" + ", ".join(f"{lon} {lat}" for lon, lat in lon_lat_pairs) + ")",
        srid=4326,
    )


ROADS = [
    {
        "id": "rd-market-1",
        "name": "Market Street",
        "type": "primary",
        "congestion": "low",
        "vehicle_count": 12,
        "avg_speed": 38.0,
        "flow_direction": 90.0,
        "signal_status": "green",
        "coords": [
            [CENTER_LON - 0.004, CENTER_LAT],
            [CENTER_LON - 0.002, CENTER_LAT],
            [CENTER_LON, CENTER_LAT],
            [CENTER_LON + 0.002, CENTER_LAT],
            [CENTER_LON + 0.004, CENTER_LAT],
        ],
    },
    {
        "id": "rd-3rd-1",
        "name": "3rd Street",
        "type": "secondary",
        "congestion": "moderate",
        "vehicle_count": 24,
        "avg_speed": 24.0,
        "flow_direction": 0.0,
        "signal_status": "yellow",
        "coords": [
            [CENTER_LON, CENTER_LAT - 0.004],
            [CENTER_LON, CENTER_LAT - 0.002],
            [CENTER_LON, CENTER_LAT],
            [CENTER_LON, CENTER_LAT + 0.002],
            [CENTER_LON, CENTER_LAT + 0.004],
        ],
    },
    {
        "id": "rd-mission-1",
        "name": "Mission Street",
        "type": "primary",
        "congestion": "heavy",
        "vehicle_count": 41,
        "avg_speed": 12.0,
        "flow_direction": 90.0,
        "signal_status": "red",
        "coords": [
            [CENTER_LON - 0.004, CENTER_LAT + 0.0025],
            [CENTER_LON - 0.002, CENTER_LAT + 0.0015],
            [CENTER_LON, CENTER_LAT + 0.001],
            [CENTER_LON + 0.002, CENTER_LAT + 0.002],
            [CENTER_LON + 0.004, CENTER_LAT + 0.003],
        ],
    },
    {
        "id": "rd-howard-1",
        "name": "Howard Street",
        "type": "secondary",
        "congestion": "severe",
        "vehicle_count": 52,
        "avg_speed": 6.0,
        "flow_direction": 90.0,
        "signal_status": "red",
        "coords": [
            [CENTER_LON - 0.004, CENTER_LAT - 0.0015],
            [CENTER_LON - 0.002, CENTER_LAT - 0.001],
            [CENTER_LON, CENTER_LAT - 0.0005],
            [CENTER_LON + 0.002, CENTER_LAT - 0.001],
            [CENTER_LON + 0.004, CENTER_LAT - 0.002],
        ],
    },
    {
        "id": "rd-emerald-1",
        "name": "Emerald Lane",
        "type": "residential",
        "congestion": "low",
        "vehicle_count": 4,
        "avg_speed": 32.0,
        "flow_direction": 45.0,
        "signal_status": None,
        "coords": [
            [CENTER_LON - 0.003, CENTER_LAT - 0.003],
            [CENTER_LON - 0.001, CENTER_LAT - 0.002],
            [CENTER_LON + 0.001, CENTER_LAT - 0.001],
        ],
    },
]

VEHICLES = [
    {"id": "veh-1", "category": "car", "label": "C-4421", "lon": CENTER_LON - 0.002, "lat": CENTER_LAT, "heading": 90, "speed": 34, "data_source": "simulation", "is_emergency": False},
    {"id": "veh-2", "category": "bus", "label": "MUNI 8142", "lon": CENTER_LON, "lat": CENTER_LAT + 0.002, "heading": 180, "speed": 18, "data_source": "simulation", "is_emergency": False},
    {"id": "veh-3", "category": "car", "label": "C-1109", "lon": CENTER_LON + 0.002, "lat": CENTER_LAT, "heading": 270, "speed": 41, "data_source": "simulation", "is_emergency": False},
    {"id": "veh-4", "category": "truck", "label": "FEDEX T-7", "lon": CENTER_LON, "lat": CENTER_LAT - 0.002, "heading": 0, "speed": 12, "data_source": "simulation", "is_emergency": False},
    {"id": "veh-5", "category": "ambulance", "label": "MEDIC 3", "lon": CENTER_LON - 0.003, "lat": CENTER_LAT + 0.0015, "heading": 45, "speed": 52, "data_source": "simulation", "is_emergency": True},
    {"id": "veh-6", "category": "police", "label": "SFPD 12", "lon": CENTER_LON + 0.003, "lat": CENTER_LAT - 0.0015, "heading": 135, "speed": 48, "data_source": "simulation", "is_emergency": True},
    {"id": "veh-7", "category": "motorcycle", "label": "POLICE M-1", "lon": CENTER_LON - 0.001, "lat": CENTER_LAT - 0.003, "heading": 60, "speed": 44, "data_source": "simulation", "is_emergency": True},
    {"id": "veh-8", "category": "fire_engine", "label": "ENGINE 9", "lon": CENTER_LON + 0.0015, "lat": CENTER_LAT + 0.003, "heading": 220, "speed": 46, "data_source": "simulation", "is_emergency": True},
]

EVENTS = [
    {
        "id": "evt-accident-1",
        "type": "accident",
        "severity": "high",
        "lon": CENTER_LON - 0.0015,
        "lat": CENTER_LAT - 0.001,
        "title": "Multi-vehicle collision",
        "description": "Accident reported at Market & 3rd St intersection. Right lane blocked.",
        "status": "active",
        "roads_affected": ["rd-market-1", "rd-3rd-1"],
    },
    {
        "id": "evt-congestion-1",
        "type": "congestion",
        "severity": "medium",
        "lon": CENTER_LON + 0.003,
        "lat": CENTER_LAT + 0.0015,
        "title": "Heavy congestion",
        "description": "Recurring congestion on Mission Street approaching 4th St.",
        "status": "active",
        "roads_affected": ["rd-mission-1"],
    },
]


async def seed():
    async with AsyncSessionLocal() as db:
        for r in ROADS:
            db.add(
                models.RoadSegment(
                    id=r["id"],
                    name=r["name"],
                    type=r["type"],
                    congestion=r["congestion"],
                    vehicle_count=r["vehicle_count"],
                    avg_speed=r["avg_speed"],
                    flow_direction=r["flow_direction"],
                    signal_status=r["signal_status"],
                    geometry=seg(r["coords"]),
                )
            )
        for v in VEHICLES:
            db.add(
                models.Vehicle(
                    id=v["id"],
                    category=v["category"],
                    label=v["label"],
                    lon=v["lon"],
                    lat=v["lat"],
                    heading=v["heading"],
                    speed=v["speed"],
                    data_source=v["data_source"],
                    is_emergency=v["is_emergency"],
                    position=WKTElement(f"POINT({v['lon']} {v['lat']})", srid=4326),
                )
            )
        for e in EVENTS:
            db.add(
                models.TrafficEvent(
                    id=e["id"],
                    type=e["type"],
                    severity=e["severity"],
                    lon=e["lon"],
                    lat=e["lat"],
                    title=e["title"],
                    description=e["description"],
                    status=e["status"],
                    roads_affected=e["roads_affected"],
                    position=WKTElement(f"POINT({e['lon']} {e['lat']})", srid=4326),
                )
            )
        await db.commit()
    print("Seed complete.")


if __name__ == "__main__":
    asyncio.run(seed())

