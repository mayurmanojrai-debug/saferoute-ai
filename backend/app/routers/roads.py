"""Road segment REST endpoints."""

from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from geoalchemy2 import WKTElement

from ..database import get_db
from .. import models
from .. import schemas

router = APIRouter(tags=["roads"])


@router.get("", response_model=list[schemas.RoadSegmentOut])
async def list_roads(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.RoadSegment))
    return result.scalars().all()


@router.get("/{road_id}", response_model=schemas.RoadSegmentOut)
async def get_road(road_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(models.RoadSegment).where(models.RoadSegment.id == road_id)
    )
    r = result.scalar_one_or_none()
    if not r:
        raise HTTPException(status_code=404, detail="Road not found")
    return r


@router.patch("/{road_id}", response_model=schemas.RoadSegmentOut)
async def update_road(
    road_id: str,
    payload: schemas.RoadSegmentBase,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(models.RoadSegment).where(models.RoadSegment.id == road_id)
    )
    r = result.scalar_one_or_none()
    if not r:
        raise HTTPException(status_code=404, detail="Road not found")
    r.name = payload.name
    r.type = payload.type
    r.congestion = payload.congestion
    r.vehicle_count = payload.vehicle_count
    r.avg_speed = payload.avg_speed
    r.flow_direction = payload.flow_direction
    r.signal_status = payload.signal_status
    coords = ", ".join(f"{lon} {lat}" for lon, lat in payload.coordinates)
    r.geometry = WKTElement(f"LINESTRING({coords})", srid=4326)
    await db.commit()
    await db.refresh(r)
    return r
