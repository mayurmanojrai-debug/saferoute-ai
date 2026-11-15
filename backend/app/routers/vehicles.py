"""Vehicle REST endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from geoalchemy2 import WKTElement

from ..database import get_db
from .. import models
from .. import schemas

router = APIRouter(tags=["vehicles"])


@router.get("", response_model=list[schemas.VehicleOut])
async def list_vehicles(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Vehicle))
    return result.scalars().all()


@router.get("/{vehicle_id}", response_model=schemas.VehicleOut)
async def get_vehicle(vehicle_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(models.Vehicle).where(models.Vehicle.id == vehicle_id)
    )
    v = result.scalar_one_or_none()
    if not v:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return v


@router.post("", response_model=schemas.VehicleOut, status_code=status.HTTP_201_CREATED)
async def upsert_vehicle(payload: schemas.VehicleBase, db: AsyncSession = Depends(get_db)):
    """Ingest a single vehicle telemetry update (GPS, camera feed, or sim)."""
    wkt = f"POINT({payload.position[0]} {payload.position[1]})"
    result = await db.execute(
        select(models.Vehicle).where(models.Vehicle.id == payload.id)
    )
    existing = result.scalar_one_or_none()
    if existing:
        existing.lon = payload.position[0]
        existing.lat = payload.position[1]
        existing.alt = payload.position[2] if len(payload.position) > 2 else 0.0
        existing.heading = payload.heading
        existing.speed = payload.speed
        existing.category = payload.category
        existing.label = payload.label
        existing.data_source = payload.data_source
        existing.is_emergency = payload.is_emergency
        existing.route_id = payload.route_id
        existing.road_progress = payload.road_progress
        existing.position = WKTElement(wkt, srid=4326)
        await db.commit()
        await db.refresh(existing)
        return existing
    obj = models.Vehicle(
        id=payload.id,
        category=payload.category,
        label=payload.label,
        lon=payload.position[0],
        lat=payload.position[1],
        alt=payload.position[2] if len(payload.position) > 2 else 0.0,
        heading=payload.heading,
        speed=payload.speed,
        data_source=payload.data_source,
        is_emergency=payload.is_emergency,
        route_id=payload.route_id,
        road_progress=payload.road_progress,
        position=WKTElement(wkt, srid=4326),
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj
