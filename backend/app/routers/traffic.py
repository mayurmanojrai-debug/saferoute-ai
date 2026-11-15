"""Traffic aggregation endpoints."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from ..database import get_db
from .. import models

router = APIRouter(tags=["traffic"])


@router.get("")
async def traffic_summary(db: AsyncSession = Depends(get_db)):
    roads = (await db.execute(select(models.RoadSegment))).scalars().all()
    vehicles = (await db.execute(select(models.Vehicle))).scalars().all()
    by_congestion = {}
    for r in roads:
        by_congestion[r.congestion] = by_congestion.get(r.congestion, 0) + 1
    return {
        "roadCount": len(roads),
        "vehicleCount": len(vehicles),
        "byCongestion": by_congestion,
        "avgSpeed": (
            round(sum(r.avg_speed for r in roads) / len(roads), 1) if roads else 0
        ),
        "emergencyVehicles": sum(1 for v in vehicles if v.is_emergency),
    }


@router.get("/congestion")
async def congestion(db: AsyncSession = Depends(get_db)):
    return await traffic_summary(db)
