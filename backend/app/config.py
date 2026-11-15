from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "SafeRoute AI"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    API_V1_STR: str = "/api/v1"

    # CORS
    BACKEND_CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    # Database (PostgreSQL + PostGIS)
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/saferoute"
    DATABASE_SYNC_URL: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/saferoute"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Simulation
    SIMULATION_ENABLED: bool = True
    SIMULATION_VEHICLE_COUNT: int = 60
    SIMULATION_TICK_INTERVAL_MS: int = 1000

    # Cesium / 3D Tiles
    CESIUM_ION_ACCESS_TOKEN: str = ""
    CESIUM_3D_TILES_URL: str = ""

    # OSM / Routing
    OSRM_BASE_URL: str = "http://router.project-osrm.org"

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache
def get_settings() -> Settings:
    return Settings()
