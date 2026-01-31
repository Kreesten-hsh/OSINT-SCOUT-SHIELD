import asyncio
from app.database import engine, Base
from app.models import * # Import all models to ensure they are registered

async def update_schema():
    print("Updating Database Schema...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Schema Updated.")

if __name__ == "__main__":
    asyncio.run(update_schema())
