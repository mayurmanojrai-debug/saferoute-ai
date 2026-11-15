# SafeRoute AI — Architecture

Next-generation 3D Smart City Traffic Monitoring & Accident Prevention Platform.
A professional traffic-intelligence command center built on a real-world 3D digital
twin (CesiumJS), live telemetry (FastAPI + WebSockets + PostGIS), and AI vision
(YOLO/OpenCV).

---

## 1. High-level data flow

```
┌─────────────┐      GPS/telemetry      ┌──────────────────┐
│ Vehicles /  │ ───────────────────────►│  FastAPI Backend │
│ Cameras     │   (WebSocket / REST)    │  + PostGIS +     │
│ (AI feeds)  │                         │   Redis          │
└─────────────┘                         └────────┬─────────┘
                                                 │ WS broadcast
                                                 ▼
                                      ┌──────────────────┐
                                      │  React Frontend  │
                                      │  (Vite + TS)     │
                                      │  Cesium + Resium │
                                      └──────────────────┘
```

1. **Ingestion** — Vehicle GPS telemetry, camera feeds (YOLO/OpenCV), and
   authorized third-party feeds POST to `/api/v1/vehicles` or stream over
   WebSocket `/api/v1/ws/telemetry`.
2. **State** — PostgreSQL + PostGIS stores roads, vehicles, and events as real
   geometry (POINT/LINESTRING SRID 4326). Redis caches hot traffic state.
3. **Simulation** — When no live feed is configured, a clearly-labelled
   road-constrained simulation advances vehicles along real road linestrings
   (Turf.js-style distance interpolation) and broadcasts over WebSocket.
4. **Visualization** — CesiumJS (Resium) renders world terrain, OSM imagery,
   optional 3D Tiles buildings, extruded fallback buildings, color-coded roads,
   3D oriented vehicles, traffic signals, and accident markers.
5. **AI** — Python `traffic_analyzer.py` consumes camera frames, detects/tracks
   vehicles, classifies congestion, and emits incidents.

---

## 2. Frontend stack

| Layer | Tech | Purpose |
|-------|------|---------|
| Build | Vite + TypeScript | dev server, bundling, type safety |
| UI | React 18 + Tailwind CSS + Framer Motion | command-center shell, glass panels, transitions |
| State | Zustand | vehicles, traffic roads, events, simulation, camera |
| 3D GIS | CesiumJS + Resium | globe, terrain, imagery, 3D Tiles, entities |
| 3D effects | Three.js / @react-three/fiber | custom vehicle geometry & effects |
| Icons | lucide-react | consistent iconography |

### Key frontend modules
- `src/components/MapView.tsx` — Cesium/Resium viewer; terrain + OSM imagery;
  optional 3D Tiles; road polylines color-coded by congestion; 3D box vehicles
  with heading orientation, labels, and glow trails; extruded building
  fallbacks; click picking → vehicle/road/event selection; per-tick simulation
  advancement.
- `src/components/Toolbar.tsx` — live/offline indicator, simulation start/stop,
  reset camera, fullscreen.
- `src/components/CameraControls.tsx` — camera presets (city overview, street
  level, intersection, accident, emergency), top-down/perspective, mobile
  floating controls.
- `src/components/VehiclePanel.tsx` / `RoadPanel.tsx` — floating detail panels.
- `src/components/SimulationBanner.tsx` — always-visible SIMULATION vs LIVE
  label so data provenance is never ambiguous.
- `src/components/TrafficLegend.tsx` — congestion color key + live counts.
- `src/components/EventNotifications.tsx` — active incident list.
- `src/store/*` — Zustand stores (map, vehicles, traffic, simulation, UI).
- `src/lib/simulation.ts` — road-constrained client simulation engine.
- `src/lib/websocket.ts` — WebSocket telemetry client with reconnect.

---

## 3. Backend stack

| Layer | Tech | Purpose |
|-------|------|---------|
| API | FastAPI (Python) | REST + WebSocket |
| DB | PostgreSQL + PostGIS | real geometry, spatial queries |
| Cache | Redis | hot traffic/session state |
| Serialization | SQLAlchemy 2.0 async + Pydantic v2 | models & schemas |

### Backend modules
- `app/main.py` — FastAPI app, CORS, lifespan (DB init + simulation boot),
  router registration, `/health`, simulation status.
- `app/database.py` — async SQLAlchemy engine/session, `Base`.
- `app/models.py` — `Vehicle`, `RoadSegment`, `TrafficEvent`, `SimulationRun`
  with PostGIS `Geometry(POINT,4326)` / `Geometry(LINESTRING,4326)`.
- `app/schemas.py` — Pydantic v2 request/response schemas.
- `app/routers/{vehicles,roads,traffic,events,simulation,ws}.py` — REST +
  WebSocket telemetry broadcast manager.
- `app/services/simulation.py` — server-side road-constrained simulation that
  persists to PostGIS and broadcasts vehicle batches over WebSocket.
- `app/services/osm_import.py` — OSM → PostGIS road import hook (production).
- `seed_data.py` — sample San Francisco SOMA geometry (demonstration only).
- `init_db.py` — enables `postgis`/`postgis_topology` and creates tables.

---

## 4. AI / computer vision

- `ai/traffic_analyzer.py` — `TrafficAnalyzer` class.
  - **YOLO path** (`ultralytics`): detects + tracks vehicles by class
    (car/truck/bus/motorcycle/emergency), outputs per-frame detections with
    track IDs.
  - **OpenCV fallback**: background-subtraction motion detection when no YOLO
    weights are configured; labelled `opencv_fallback`.
- `ai/model_config.yaml` — model path, confidence/IoU, class list, congestion
  thresholds, video source.
- `ai/requirements.txt` — opencv-python, numpy, scikit-learn, pydantic;
  ultralytics optional.


---

## 5. Geospatial approach

- **Real coordinates** — All geometry uses WGS84 (SRID 4326) longitude/latitude.
  Seed data uses real San Francisco SOMA coordinates (Market & 3rd St area).
- **Roads** — Stored as PostGIS LINESTRING; rendered as clamped-to-ground
  polylines colored by congestion.
- **Buildings** — Prefer Cesium 3D Tiles (Cesium OSM Buildings) when a Cesium
  Ion token + tiles URL is configured (`VITE_CESIUM_3D_TILES_URL`).
  Otherwise, extruded fallback buildings are generated from footprint polygons.
- **Movement** — Vehicles are interpolated along road linestrings by cumulative
  distance (Turf.js-equivalent logic), with heading derived from the road
  tangent. This guarantees road-constrained motion.
- **Never fabricate live data** — Client-side `lib/websocket.ts` falls back to
  simulation silently; the UI always labels the mode. Simulation coordinates are
  never presented as live GPS.

---

## 6. Camera controls (desktop + mobile)

Desktop (native Cesium CameraController):
- Left-drag rotate, scroll zoom, right-drag pan, double-click focus.
- Buttons: reset camera, top-down, perspective.

Presets (smooth fly-to interpolation):
- City overview, street level, traffic intersection, accident location,
  emergency response.

Mobile:
- One-finger pan, two-finger pinch zoom, tap to inspect, responsive floating
  preset controls.

---

## 7. Congestion color scale

| Level | Color | Meaning |
|-------|-------|---------|
| Low | `#22c55e` green | free flow |
| Moderate | `#eab308` yellow | noticeable delay |
| Heavy | `#f59e0b` orange | congested |
| Severe | `#ef4444` red | gridlock / incident |
| Unknown | `#64748b` slate | no data |

---

## 8. Security & data-provenance notes

- Simulation mode is opt-in and always visibly labelled (`SIMULATION MODE`).
- No random coordinates are ever presented as real telemetry.
- CORS is restricted to `BACKEND_CORS_ORIGINS`.
- WebSocket telemetry is unauthenticated in this scaffold; add JWT/API-key
  auth in production (`ws` router).
- Cesium Ion token required only for 3D Tiles / Bing imagery; OSM imagery works
  without a key.

