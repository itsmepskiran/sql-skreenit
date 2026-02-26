"""
Minimal test to isolate the exact issue
"""

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 Starting Skreenit API...")
    print("📊 Creating MySQL database tables...")
    print("✅ Database tables already exist (created via phpMyAdmin)")
    print("🔐 Supabase will be used for authentication only")
    print("📁 MySQL will be used for all data storage")
    yield
    print("🛑 Shutting down...")

print("Creating FastAPI app...")
app = FastAPI(
    title="Skreenit API",
    description="Job Application Platform with MySQL + Supabase Auth",
    version="2.0.0",
    lifespan=lifespan
)

@app.get("/")
async def root():
    return {"message": "Skreenit API is running!"}

print("About to start uvicorn...")
if __name__ == "__main__":
    import uvicorn
    print("Starting uvicorn...")
    uvicorn.run(app, host="0.0.0.0", port=8006)
    print("Uvicorn started!")
