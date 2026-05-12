import os

# Try to load .env file in development
try:
    from pathlib import Path
    from dotenv import load_dotenv
    
    env_path = Path(__file__).resolve().parents[1] / ".env"
    if env_path.exists():
        load_dotenv(dotenv_path=env_path)
except Exception:
    pass

# Support both environment variable and .env file
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./data/chat.db"
)