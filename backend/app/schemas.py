"""Pydantic schemas for the SafeRoute AI API."""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class VehicleBase(BaseModel):
    id: str
    category: str
    label: str
    position: List[float]  # [lon, lat, alt]
    heading: float
    speed: float
    data_source: str
    is_emergency: bool = False
    route_id: Optional[str] = None
    road_progress: float = 0.0


class VehicleOut(VehicleBase):
    last_update: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class RoadSegmentBase(BaseModel):
    id: str
    name: str
    type: str
    coordinates: List[List[float]]  # [[lon,lat], ...]
    congestion: str
    vehicle_count: int
    avg_speed: float
    flow_direction: float
    signal_status: Optional[str] = None


class RoadSegmentOut(RoadSegmentBase):
    model_config = ConfigDict(from_attributes=True)


class TrafficEventBase(BaseModel):
    id: str
    type: str
    severity: str
    position: List[float]  # [lon, lat]
    title: str
    description: str = ""
    status: str = "active"
    roads_affected: List[str] = []


class TrafficEventOut(TrafficEventBase):
    reported_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class SimulationStart(BaseModel):
    vehicle_count: int = 60


class TelemetryAck(BaseModel):
    status: str
