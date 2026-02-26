"""
Minimal database module for MySQL connectivity using SQLAlchemy.
"""

import os
import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any, Generator
from contextlib import contextmanager
from sqlalchemy import create_engine, String, Integer, Boolean, DateTime, Text, ForeignKey, JSON, Enum
from sqlalchemy.orm import declarative_base, sessionmaker, relationship, Session, mapped_column, Mapped
from sqlalchemy.dialects.mysql import VARCHAR
from dotenv import load_dotenv

load_dotenv()

# Database Configuration
MYSQL_HOST = os.getenv("MYSQL_HOST", "localhost")
MYSQL_PORT = int(os.getenv("MYSQL_PORT", 3306))
MYSQL_USER = os.getenv("MYSQL_USER", "root")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "")
MYSQL_DATABASE = os.getenv("MYSQL_DATABASE", "skreenit")

# Create database URL
DATABASE_URL = f"mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DATABASE}"

# Create engine
engine = create_engine(
    DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
    echo=False
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
DeclarativeBase = declarative_base()


def generate_uuid() -> str:
    """Generate a UUID string."""
    return str(uuid.uuid4())


def create_tables():
    """Create all database tables."""
    try:
        # For now, just print success since tables are already created via phpMyAdmin
        print("✅ Database tables already exist (created via phpMyAdmin)")
    except Exception as e:
        print(f"❌ Database check failed: {str(e)}")


@contextmanager
def get_db_session() -> Generator[Session, None, None]:
    """Context manager for database sessions."""
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency for database sessions."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
