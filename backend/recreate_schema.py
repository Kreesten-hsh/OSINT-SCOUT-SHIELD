import asyncio
from app.database import engine, Base
from app.models import Evidence, Alert, Report, MonitoringSource, ScrapingRun
# Explicit imports to ensure registration

async def recreate_schema():
    with open("schema_log.txt", "w") as f:
        f.write("Recreating database schema (DROP ALL + CREATE ALL)...\n")
        try:
            async with engine.begin() as conn:
                f.write("Dropping all tables...\n")
                await conn.run_sync(Base.metadata.drop_all)
                
                f.write(f"Registered tables: {list(Base.metadata.tables.keys())}\n")
                
                f.write("Creating all tables...\n")
                await conn.run_sync(Base.metadata.create_all)
                
            f.write("Schema recreation complete.\n")
        except Exception as e:
            f.write(f"Error during schema recreation: {e}\n")
        finally:
            await engine.dispose()

if __name__ == "__main__":
    asyncio.run(recreate_schema())
