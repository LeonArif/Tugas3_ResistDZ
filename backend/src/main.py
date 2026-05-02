from fastapi import FastAPI
from routes import auth
from database import init_db
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI()
app.include_router(auth.router)

