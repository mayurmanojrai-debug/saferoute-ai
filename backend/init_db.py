"""Initialize PostgreSQL + PostGIS and create SafeRoute AI tables.

Run:  python init_db.py
Requires: a running PostgreSQL server with the `postgis` extension available.
"""

import asyncio
from sqlalchemy import text
from app.database import engine, Base


async def init():
    async with engine.begin() as conn:
        # Enable PostGIS (must exist in the database; superuser typically required).
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis_topology"))
        await conn.run_sync(Base.metadata.create_all)
    print("Database initialized (postgis + tables).")


if __name__ == "__main__":
    asyncio.run(init())
