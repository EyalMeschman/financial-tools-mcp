"""SQLAlchemy models for invoice processing."""

from datetime import UTC, datetime

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    """Base class for all database models."""

    pass


class Job(Base):
    """Job model for tracking batch invoice processing jobs."""

    __tablename__ = "jobs"

    job_id: Mapped[str] = mapped_column(String, primary_key=True)
    status: Mapped[str] = mapped_column(String, nullable=False)
    processed: Mapped[int] = mapped_column(Integer, default=0)
    total: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(UTC))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC)
    )

    # Relationship to files
    files: Mapped[list["File"]] = relationship("File", back_populates="job")


class File(Base):
    """File model for tracking individual invoice files."""

    __tablename__ = "files"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    job_id: Mapped[str] = mapped_column(String, ForeignKey("jobs.job_id"), nullable=False)
    filename: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False, index=True)
    original_currency: Mapped[str | None] = mapped_column(String)
    target_currency: Mapped[str | None] = mapped_column(String)
    error_message: Mapped[str | None] = mapped_column(String)

    # New columns for currency conversion tracking
    converted_total: Mapped[float | None] = mapped_column(Numeric(10, 2), index=True)
    exchange_rate: Mapped[float | None] = mapped_column(Numeric(10, 6), index=True)

    # Relationship to job
    job: Mapped["Job"] = relationship("Job", back_populates="files")
