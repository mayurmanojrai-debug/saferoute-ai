"""Traffic event endpoints."""

from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from geoalchemy2 import WKTElement

from ..database import get_db
from .. import models
from .. import schemas

router = APIRouter(tags=["events"])


@router.get("", response_model=list[schemas.TrafficEventOut])
async def list_events(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(models.TrafficEvent).order_by(models.TrafficEvent.reported_at.desc())
    )
    return result.scalars().all()


@router.post("", response_model=schemas.TrafficEventOut, status_code=201)
async def create_event(
    payload: schemas.TrafficEventBase,
    db: AsyncSession = Depends(get_db),
):
    lon, lat = payload.position
    wkt = f"POINT({lon} {lat})"
    obj = models.TrafficEvent(
        id=payload.id,
        type=payload.type,
        severity=payload.severity,
        lon=lon,
        lat=lat,
        title=payload.title,
        description=payload.description,
        status=payload.status,
        roads_affected=payload.roads_affected,
        position=WKTElement(wkt, srid=4326),
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.patch("/{event_id}/resolve", response_model=schemas.TrafficEventOut)
async def resolve_event(event_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(models.TrafficEvent).where(models.TrafficEvent.id == event_id)
    )
    ev = result.scalar_one_or_none()
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")
    ev.status = "resolved"
    await db.commit()
    await db.refresh(ev)
    return ev
