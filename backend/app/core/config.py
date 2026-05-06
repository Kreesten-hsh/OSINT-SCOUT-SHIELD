from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore",
    )

    PROJECT_NAME: str = "BENIN CYBER SHIELD"
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
    PHONE_ENCRYPTION_SECRET: str | None = None
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    AUTH_ADMIN_EMAIL: str = "admin@osint.com"
    AUTH_ADMIN_PASSWORD: str = "CHANGE_ME_ADMIN_PASSWORD"
    AUTH_SME_EMAIL: str = "sme@osint.com"
    AUTH_SME_PASSWORD: str = "CHANGE_ME_SME_PASSWORD"

    # Security
    BACKEND_CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]
    LOG_JSON: bool = False
    LOG_LEVEL: str = "INFO"
    SQL_ECHO: bool = False
    AUTO_CREATE_TABLES: bool = False
    ENABLE_FORENSIC_CAPTURE: bool = True
    ENABLE_RESULT_CONSUMER: bool = True
    ENABLE_EXTERNAL_TRANSMISSION_CONSUMER: bool = True

    # Observability
    SENTRY_DSN: str | None = None

    # SHIELD simulation
    SHIELD_OPERATOR_SHARED_SECRET: str = "dev-operator-secret"
    SHIELD_ACTION_TTL_SECONDS: int = 86400

    # External transmission simulation
    EXTERNAL_TRANSMISSION_SHARED_SECRET: str = "dev-transmission-secret"
    EXTERNAL_ANSSI_RECEIVER_URL: str = "http://127.0.0.1:8000/api/v1/external/anssi-ocrc/receive"
    EXTERNAL_OPERATORS_RECEIVER_URL: str = "http://127.0.0.1:8000/api/v1/external/operators/receive"
    EXTERNAL_NUMBER_THRESHOLD: int = 3
    EXTERNAL_MAX_ATTEMPTS: int = 4
    EXTERNAL_RETRY_DELAY_SECONDS: int = 30

    def _normalize_database_url(self, database_url: str) -> str:
        normalized_url = database_url.strip()
        if normalized_url.startswith("postgres://"):
            normalized_url = normalized_url.replace("postgres://", "postgresql://", 1)
        if normalized_url.startswith("postgresql://"):
            return normalized_url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return normalized_url

    @property
    def effective_database_url(self) -> str:
        if self.DATABASE_URL:
            return self._normalize_database_url(self.DATABASE_URL)
        default_url = (
            f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )
        return self._normalize_database_url(default_url)


settings = Settings()
