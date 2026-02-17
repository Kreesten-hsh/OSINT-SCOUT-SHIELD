from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
    )

    PROJECT_NAME: str = "OSINT-SCOUT-SHIELD"
    API_V1_STR: str = "/api/v1"

    # Database
    POSTGRES_USER: str = "osint_user"
    POSTGRES_PASSWORD: str = "osint_password"
    POSTGRES_DB: str = "osint_db"
    POSTGRES_HOST: str = "db"
    POSTGRES_PORT: str = "5432"
    DATABASE_URL: str | None = None

    # Redis
    REDIS_URL: str = "redis://redis:6379/0"

    # Auth
    SECRET_KEY: str = "CHANGE_ME_IN_PRODUCTION"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    AUTH_ADMIN_EMAIL: str = "admin@osint.com"
    AUTH_ADMIN_PASSWORD: str = "CHANGE_ME_ADMIN_PASSWORD"

    # Security
    BACKEND_CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]
    LOG_JSON: bool = False
    LOG_LEVEL: str = "INFO"
    SQL_ECHO: bool = False
    AUTO_CREATE_TABLES: bool = False
    ENABLE_RESULT_CONSUMER: bool = True

    # Observability
    SENTRY_DSN: str | None = None

    # SHIELD simulation
    SHIELD_OPERATOR_SHARED_SECRET: str = "dev-operator-secret"
    SHIELD_ACTION_TTL_SECONDS: int = 86400

    @property
    def effective_database_url(self) -> str:
        if self.DATABASE_URL:
            return self.DATABASE_URL
        return (
            f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )


settings = Settings()
