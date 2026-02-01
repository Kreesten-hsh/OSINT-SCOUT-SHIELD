import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

# Use the same logic as app/core/config.py to get DB URL
# Or just hardcode the likely service URL internal to docker
DATABASE_URL = os.getenv("SQLALCHEMY_DATABASE_URI", "postgresql+asyncpg://osint_user:osint_password@db/osint_db")

async def fix_schema():
    print(f"Connecting to {DATABASE_URL}...")
    engine = create_async_engine(DATABASE_URL)
    
    async with engine.begin() as conn:
        print("Checking column existence...")
        # Check if column exists to avoid error or just use IF NOT EXISTS
        try:
            await conn.execute(text("ALTER TABLE alerts ADD COLUMN IF NOT EXISTS analysis_note TEXT;"))
            print("SUCCESS: 'analysis_note' column added (or already existed).")
        except Exception as e:
            print(f"FAILURE: {e}")
            
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(fix_schema())
