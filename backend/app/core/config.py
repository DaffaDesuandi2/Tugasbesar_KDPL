import os

class Settings:
    PROJECT_NAME: str = "PosTera API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # Database URL
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./postera.db")
    
    # Security & Sessions
    SESSION_EXPIRE_HOURS: int = 24
    SESSION_COOKIE_NAME: str = "postera_session"
    
    # Rate Limiting
    LOGIN_RATE_LIMIT: str = "5/minute"
    
    # CORS
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]

settings = Settings()
