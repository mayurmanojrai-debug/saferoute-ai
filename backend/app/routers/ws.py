"""WebSocket telemetry endpoint."""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from ..main import manager

router = APIRouter(tags=["telemetry"])


@router.websocket("/ws/telemetry")
async def telemetry_websocket(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection open; optionally receive client messages.
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
