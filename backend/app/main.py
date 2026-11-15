"""SafeRoute AI FastAPI application."""

import asyncio
import uuid
from contextlib import asynccontextmanager
from typing import Dict, Set

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import get_settings
from .database import engine, Base, get_db
from . import models
from .routers import vehicles, roads, traffic, events, simulation, ws
from .services.simulation import SimulationService

settings = get_settings()

# Background simulation service instance (started in lifespan).
simulation_service: SimulationService | None = None


class ConnectionManager:
    """WebSocket connection manager for live telemetry broadcast."""

    def __init__(self) -> None:
        self.active: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active.add(websocket)

    def disconnect(self, websocket: WebSocket) -> None:
        self.active.discard(websocket)

    async def broadcast(self, message: dict) -> None:
        dead: list[WebSocket] = []
        for ws in list(self.active):
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)


manager = ConnectionManager()


@asynccontextmanager
async def lifespan(app: FastAPI):
    global simulation_service
    # Create tables (PostGIS extensions must be enabled in the DB first — see init_db.py).
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    simulation_service = SimulationService(manager)
    if settings.SIMULATION_ENABLED:
        asyncio.create_task(simulation_service.start(settings.SIMULATION_VEHICLE_COUNT))

    yield

    if simulation_service:
        await simulation_service.stop()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.BACKEND_CORS_ORIGINS.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(vehicles.router, prefix=settings.API_V1_STR)
app.include_router(roads.router, prefix=settings.API_V1_STR)
app.include_router(traffic.router, prefix=settings.API_V1_STR)
app.include_router(events.router, prefix=settings.API_V1_STR)
app.include_router(simulation.router, prefix=settings.API_V1_STR)
app.include_router(ws.router, prefix=settings.API_V1_STR)


@app.get("/health")
async def health():
    return {"status": "ok", "service": settings.APP_NAME, "version": settings.APP_VERSION}


@app.get("/api/v1/simulation/status")
async def simulation_status():
    running = simulation_service is not None and simulation_service.running
    return {"running": running, "mode": "simulation" if settings.SIMULATION_ENABLED else "live"}
