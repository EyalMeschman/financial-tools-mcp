"""Database session management."""

import os

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from .models import Base

# Get database URL from environment, default to SQLite
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./invoice.db")

# Create engine
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {})

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_session() -> Session:
    """Get a database session."""
    session = SessionLocal()
    try:
        return session
    except Exception:
        session.close()
        raise


def create_tables():
    """Create all tables."""
    Base.metadata.create_all(bind=engine)
