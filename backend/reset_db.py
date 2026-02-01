import asyncio
from app.database import engine
from sqlalchemy import text

async def reset_db():
    print("Starting database reset...")
    try:
        async with engine.begin() as conn:
            print("Disabling constraints/triggers...")
            await conn.execute(text("SET session_replication_role = 'replica';"))
            
            # Order matters for cascading, but with CASCADE it should be fine.
            # Truncating main tables should propagate if set up, but let's be explicit.
            tables = ["analysis_results", "evidences", "alerts", "scraping_runs", "monitoring_sources"]
            
            for table in tables:
                print(f"Truncating {table}...")
                try:
                    await conn.execute(text(f"TRUNCATE TABLE {table} CASCADE;"))
                except Exception as e:
                    print(f"Error truncating {table}: {e}")
                    
            print("Enabling constraints/triggers...")
            await conn.execute(text("SET session_replication_role = 'origin';"))
            print("Database reset complete.")
    except Exception as e:
        print(f"Connection error: {e}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(reset_db())
