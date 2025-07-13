"""Tests for database models."""

import os
import tempfile
from datetime import datetime

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models import Base, File, Job


@pytest.fixture
def temp_db_session():
    """Create a temporary database session for testing."""
    # Create a temporary file for the SQLite database
    db_fd, db_path = tempfile.mkstemp(suffix=".db")
    os.close(db_fd)

    try:
        # Create engine and session
        engine = create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False})
        Base.metadata.create_all(bind=engine)

        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        session = SessionLocal()

        yield session

        session.close()
    finally:
        # Clean up the temporary database file
        if os.path.exists(db_path):
            os.unlink(db_path)


def test_job_creation(temp_db_session):
    """Test creating and querying a Job."""
    # Create a job
    job = Job(job_id="test-job-123", status="pending", processed=0, total=5)

    temp_db_session.add(job)
    temp_db_session.commit()

    # Query back the job
    retrieved_job = temp_db_session.query(Job).filter(Job.job_id == "test-job-123").first()

    assert retrieved_job is not None
    assert retrieved_job.job_id == "test-job-123"
    assert retrieved_job.status == "pending"
    assert retrieved_job.processed == 0
    assert retrieved_job.total == 5
    assert isinstance(retrieved_job.created_at, datetime)
    assert isinstance(retrieved_job.updated_at, datetime)


def test_file_creation(temp_db_session):
    """Test creating and querying a File."""
    # Create a job first
    job = Job(job_id="test-job-456", status="processing", processed=1, total=3)
    temp_db_session.add(job)
    temp_db_session.commit()

    # Create a file associated with the job
    file = File(
        job_id="test-job-456",
        filename="invoice1.pdf",
        status="completed",
        original_currency="USD",
        target_currency="EUR",
    )

    temp_db_session.add(file)
    temp_db_session.commit()

    # Query back the file
    retrieved_file = temp_db_session.query(File).filter(File.filename == "invoice1.pdf").first()

    assert retrieved_file is not None
    assert retrieved_file.job_id == "test-job-456"
    assert retrieved_file.filename == "invoice1.pdf"
    assert retrieved_file.status == "completed"
    assert retrieved_file.original_currency == "USD"
    assert retrieved_file.target_currency == "EUR"
    assert retrieved_file.error_message is None


def test_job_file_relationship(temp_db_session):
    """Test the relationship between Job and File models."""
    # Create a job
    job = Job(job_id="test-job-789", status="completed", processed=2, total=2)
    temp_db_session.add(job)
    temp_db_session.commit()

    # Create files associated with the job
    file1 = File(
        job_id="test-job-789",
        filename="invoice1.pdf",
        status="completed",
        original_currency="USD",
        target_currency="EUR",
    )

    file2 = File(
        job_id="test-job-789",
        filename="invoice2.pdf",
        status="failed",
        original_currency="GBP",
        target_currency="EUR",
        error_message="Invalid PDF format",
    )

    temp_db_session.add_all([file1, file2])
    temp_db_session.commit()

    # Query job and check relationship
    retrieved_job = temp_db_session.query(Job).filter(Job.job_id == "test-job-789").first()
    assert len(retrieved_job.files) == 2

    # Check file relationship back to job
    retrieved_file = temp_db_session.query(File).filter(File.filename == "invoice1.pdf").first()
    assert retrieved_file.job.job_id == "test-job-789"
    assert retrieved_file.job.status == "completed"
