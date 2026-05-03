from fastapi import FastAPI
from .routes import auth
from .database import init_db
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        init_db()
    except Exception as e:
        print(f"Error initializing database: {e}")
    yield

app = FastAPI(lifespan=lifespan)
app.include_router(auth.router, prefix="/api")

