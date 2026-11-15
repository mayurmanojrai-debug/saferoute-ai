"""Simulation control endpoints."""

from fastapi import APIRouter, HTTPException
from ..main import simulation_service
from .. import schemas

router = APIRouter(tags=["simulation"])


@router.post("/start")
async def start_simulation(payload: schemas.SimulationStart):
    if simulation_service is None:
        raise HTTPException(status_code=503, detail="Simulation service unavailable")
    await simulation_service.start(payload.vehicle_count)
    return {"status": "started", "vehicleCount": payload.vehicle_count, "mode": "simulation"}


@router.post("/stop")
async def stop_simulation():
    if simulation_service is None:
        raise HTTPException(status_code=503, detail="Simulation service unavailable")
    await simulation_service.stop()
    return {"status": "stopped", "mode": "simulation"}
