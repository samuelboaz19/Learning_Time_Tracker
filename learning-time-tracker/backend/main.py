import os
import psycopg

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pydantic import BaseModel

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATABASE_URL = os.getenv("DATABASE_URL")


# This describes the data FastAPI expects from Chrome Extension
class UsageEvent(BaseModel):
    event_id: str
    timestamp: str
    website: str
    duration_seconds: int
    category: str

@app.get("/")
def home():
    return {"message": "FastAPI is running"}


@app.get("/db-test")
def db_test():
    with psycopg.connect(DATABASE_URL) as conn:
        result = conn.execute("SELECT version()").fetchone()

    return {
        "database": "connected",
        "version": result[0]
    }


@app.post("/usage")
def receive_usage(event: UsageEvent):

    with psycopg.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:

           cur.execute(
    """
    INSERT INTO website_usage
    (event_id, time, website, duration_seconds, category)
    VALUES (%s, %s, %s, %s, %s)
    """,
    (
        event.event_id,
        event.timestamp,
        event.website,
        event.duration_seconds,
        event.category
    )
)
            

        conn.commit()

    return {
        "message": "Usage data stored successfully"
    }