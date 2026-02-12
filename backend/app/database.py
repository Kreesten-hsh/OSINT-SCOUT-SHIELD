from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

# Création de l'engine Asynchrone
engine = create_async_engine(
    settings.effective_database_url,
    echo=settings.SQL_ECHO,
    future=True
)

# Fabrique de session
AsyncSessionLocal = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

Base = declarative_base()

# Dépendance FastAPI pour obtenir une session DB
async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
