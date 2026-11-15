# SafeRoute AI — API Reference

Base path: `/api/v1`

## Health

### `GET /health`
```json
{ "status": "ok", "service": "SafeRoute AI", "version": "1.0.0" }
```

### `GET /api/v1/simulation/status`
```json
{ "running": true, "mode": "simulation" }
```

---

## Vehicles

### `GET /vehicles`
List all tracked vehicles (latest telemetry).

Response: array of
```json
{
  "id": "veh-5",
  "category": "ambulance",
  "label": "MEDIC 3",
  "position": [-122.3933, 37.78815, 0],
  "heading": 45,
  "speed": 52,
  "lastUpdate": "2026-...",
  "dataSource": "simulation",
  "isEmergency": true,
  "routeId": "rd-market-1",
  "roadProgress": 0.34
}
```
`dataSource` ∈ `gps_telemetry | camera_feed | authorized_feed | simulation`.

### `GET /vehicles/{id}`
Single vehicle by ID. 404 if missing.

### `POST /vehicles`
Ingest one telemetry update (upsert by `id`). Used by GPS feeds, camera AI,
authorized feeds, and the simulation service.

Body:
```json
{
  "id": "veh-9",
  "category": "car",
  "label": "C-9901",
  "position": [-122.394, 37.788, 0],
  "heading": 90,
  "speed": 28,
  "data_source": "gps_telemetry",
  "is_emergency": false,
  "route_id": "rd-market-1",
  "road_progress": 0.12
}
```

---

## Roads

### `GET /roads`
All road segments with congestion, counts, speed, flow direction, signal.

### `GET /roads/{id}`
Single road segment.

### `PATCH /roads/{id}`
Update congestion/signal/geometry (traffic-operations write path).

Road object:
```json
{
  "id": "rd-market-1",
  "name": "Market Street",
  "type": "primary",
  "coordinates": [[-122.3975,37.7882],[-122.3895,37.7882]],
  "congestion": "low",
  "vehicleCount": 12,
  "avgSpeed": 38,
  "flowDirection": 90,
  "signalStatus": "green"
}
```
`congestion` ∈ `low | moderate | heavy | severe | unknown`.

---

## Traffic

### `GET /traffic`
Aggregate summary:
```json
{
  "roadCount": 5,
  "vehicleCount": 24,
  "byCongestion": { "low": 2, "moderate": 1, "heavy": 1, "severe": 1 },
  "avgSpeed": 22.5,
  "emergencyVehicles": 3
}
```

### `GET /traffic/congestion`
Alias for `/traffic`.

---

## Events (accidents / congestion / closures)

### `GET /events`
Active and resolved traffic events, newest first.

### `POST /events`
Create an incident (accident, congestion, road_closure, emergency, signal_fault).

### `PATCH /events/{id}/resolve`
Mark an event resolved.

Event object:
```json
{
  "id": "evt-accident-1",
  "type": "accident",
  "severity": "high",
  "position": [-122.395, 37.7872],
  "title": "Multi-vehicle collision",
  "description": "Right lane blocked at Market & 3rd St.",
  "reportedAt": "2026-...",
  "status": "active",
  "roadsAffected": ["rd-market-1","rd-3rd-1"]
}
```

---

## Simulation control

### `POST /simulation/start`
Body: `{ "vehicle_count": 60 }`
Starts the clearly-labelled road-constrained simulation.

### `POST /simulation/stop`
Stops simulation.

---

## WebSocket telemetry

### `WS /api/v1/ws/telemetry`
Broadcasts live vehicle updates:
```json
{ "type": "vehicle_update_batch", "payload": [ { "id": "...", "position": [lon,lat,0], "heading": 90, "speed": 34, ... } ] }
```
Connect from the frontend to replace/augment simulation with real feeds.
