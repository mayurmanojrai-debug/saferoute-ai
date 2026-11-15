# SafeRoute AI — Deployment

## Prerequisites

- Node.js 18+ (frontend)
- Python 3.11+ (backend + AI)
- PostgreSQL 14+ with PostGIS 3+ extension
- Redis 7+
- (Optional) Docker / Docker Compose

---

## A. Backend (FastAPI + PostGIS)

### 1. Database
```sql
CREATE DATABASE saferoute;
\c saferoute
CREATE EXTENSION postgis;
CREATE EXTENSION postgis_topology;
```

### 2. Configure
```bash
cd backend
cp .env.example .env
# edit .env with your DATABASE_URL, REDIS_URL, CORS origins, etc.
```

### 3. Install & init
```bash
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Initialize PostGIS + tables
python init_db.py

# Load demonstration seed data (San Francisco SOMA sample)
python seed_data.py
```

### 4. Run
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
- API: `http://localhost:8000`
- Docs: `http://localhost:8000/docs`
- WebSocket telemetry: `ws://localhost:8000/api/v1/ws/telemetry`

---

## B. Frontend

```bash
cd frontend
npm install      # postinstall copies Cesium Build/Widgets to public/cesium
npm run dev      # http://localhost:5173
npm run build    # production bundle to dist/
npm run preview
```

### Cesium assets (required)
The `postinstall` script copies `node_modules/cesium/Build` and `Widgets` into
`public/cesium`, and `index.html` sets `window.CESIUM_BASE_URL = '/cesium'`.
Verify `public/cesium/Cesium.js` exists after install.

### 3D Tiles buildings (optional)
Set in `.env` / `VITE_CESIUM_3D_TILES_URL` to a Cesium OSM Buildings tileset
and `CESIUM_ION_ACCESS_TOKEN` in the backend config if you want real-world
building meshes. Without it, the app renders extruded fallback buildings from
footprints.

---

## C. AI service (optional camera feed)

```bash
cd ai
pip install -r requirements.txt
# For YOLO, download a weights file and set weights: models/yolov8n.pt
# in ai/model_config.yaml, then uncomment ultralytics in requirements.txt.
python traffic_analyzer.py  # scaffold entry
```

Stream analysis results into the backend via `POST /api/v1/vehicles` or the
WebSocket telemetry endpoint.

---

## D. Docker (recommended)

Example `docker-compose.yml` (create at repo root):

```yaml
version: "3.8"
services:
  db:
    image: postgis/postgis:15-3.3
    environment:
      POSTGRES_DB: saferoute
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports: ["5432:5432"]
    volumes: [pgdata:/var/lib/postgresql/data]
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
  backend:
    build: ./backend
    depends_on: [db, redis]
    environment:
      DATABASE_URL: postgresql+asyncpg://postgres:postgres@db:5432/saferoute
      REDIS_URL: redis://redis:6379/0
      SIMULATION_ENABLED: "true"
    ports: ["8000:8000"]
  frontend:
    build: ./frontend
    depends_on: [backend]
    ports: ["5173:5173"]
volumes: pgdata:
```

Build: `docker compose up --build`

---

## E. Production checklist

- [ ] Replace `.env` defaults; set strong DB/Redis passwords.
- [ ] Restrict `BACKEND_CORS_ORIGINS` to your domain.
- [ ] Add JWT/API-key auth to WebSocket and vehicle-ingestion endpoints.
- [ ] Self-host OSRM or use a commercial routing provider with rate limits.
- [ ] Configure a Cesium Ion token + 3D Tiles for building-level detail.
- [ ] Run behind TLS (nginx/TLS termination) — WebSocket requires `wss://`.
- [ ] Replace simulation with authorized GPS/camera feeds; keep simulation
  behind a feature flag and visible label.
- [ ] Seed real OSM data via `app/services/osm_import.py` (osmnx → PostGIS).
