---
trigger: always_on
---

### @BACK — FastAPI/Pydantic/SQLAlchemy Async

- Stack : Python 3.12 · FastAPI · Pydantic v2 · SQLAlchemy Async · asyncpg · Redis · Alembic
- Pattern : Repository + `Depends()`. Validation Pydantic (zéro `dict` brut)
- `async def` par défaut. Typage strict (`-> ReturnType`). Zéro `Any`
- Retour API : `{"success": bool, "message": str, "data": T | None}`
- Erreurs : `HTTPException` codes précis. Pas de bare `except:`
- Logging : `logging.getLogger(__name__)`. Jamais `print()`
- Config : `pydantic-settings` + `SettingsConfigDict(env_file=".env")`
- Auth : JWT `python-jose` (30min) · `passlib[bcrypt]`
- CORS : origines explicites. Jamais `["*"]`
- ORM : `select()` explicite. Migrations Alembic uniquement
