"""SQLAlchemy models for SafeRoute AI (PostgreSQL + PostGIS)."""

import datetime as dt
from typing import Any, Dict, List, Optional

from sqlalchemy import (
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

from geoalchemy2 import Geometry


class Base(DeclarativeBase):
    pass


class Vehicle(Base):
    __tablename__ = "vehicles"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    category: Mapped[str] = mapped_column(String, nullable=False)  # car, bus, ...
    label: Mapped[str] = mapped_column(String, nullable=False)
    lon: Mapped[float] = mapped_column(Float, nullable=False)
    lat: Mapped[float] = mapped_column(Float, nullable=False)
    alt: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    heading: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    speed: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    last_update: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    data_source: Mapped[str] = mapped_column(String, nullable=False)  # gps_telemetry, camera_feed, authorized_feed, simulation
    is_emergency: Mapped[bool] = mapped_column(default=False, nullable=False)
    route_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    road_progress: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    position: Mapped[Any] = mapped_column(
        Geometry("POINT", srid=4326), nullable=False
    )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "category": self.category,
            "label": self.label,
            "position": [self.lon, self.lat, self.alt],
            "heading": self.heading,
            "speed": self.speed,
            "lastUpdate": (
                self.last_update.isoformat() if self.last_update else None
            ),
            "dataSource": self.data_source,
            "isEmergency": self.is_emergency,
            "routeId": self.route_id,
            "roadProgress": self.road_progress,
        }


class RoadSegment(Base):
    __tablename__ = "road_segments"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    type: Mapped[str] = mapped_column(String, nullable=False)  # primary, secondary, ...
    congestion: Mapped[str] = mapped_column(String, default="unknown", nullable=False)
    vehicle_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    avg_speed: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    flow_direction: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    signal_status: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    geometry: Mapped[Any] = mapped_column(
        Geometry("LINESTRING", srid=4326), nullable=False
    )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "type": self.type,
            "congestion": self.congestion,
            "vehicleCount": self.vehicle_count,
            "avgSpeed": self.avg_speed,
            "flowDirection": self.flow_direction,
            "signalStatus": self.signal_status,
        }


class TrafficEvent(Base):
    __tablename__ = "traffic_events"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    type: Mapped[str] = mapped_column(String, nullable=False)  # accident, congestion, ...
    severity: Mapped[str] = mapped_column(String, nullable=False)  # low, medium, high, critical
    lon: Mapped[float] = mapped_column(Float, nullable=False)
    lat: Mapped[float] = mapped_column(Float, nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    reported_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    status: Mapped[str] = mapped_column(String, default="active", nullable=False)
    roads_affected: Mapped[List[str]] = mapped_column(
        JSONB, default=list, nullable=False
    )
    position: Mapped[Any] = mapped_column(
        Geometry("POINT", srid=4326), nullable=False
    )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "type": self.type,
            "severity": self.severity,
            "position": [self.lon, self.lat],
            "title": self.title,
            "description": self.description,
            "reportedAt": (
                self.reported_at.isoformat() if self.reported_at else None
            ),
            "status": self.status,
            "roadsAffected": self.roads_affected,
        }


class SimulationRun(Base):
    __tablename__ = "simulation_runs"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    started_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    vehicle_count: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String, default="running", nullable=False)
