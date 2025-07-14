"""add converted_total and exchange_rate columns

Revision ID: 75399a20793f
Revises: cd3912ae6d70
Create Date: 2025-07-14 14:30:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "75399a20793f"
down_revision: str | Sequence[str] | None = "cd3912ae6d70"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Add converted_total and exchange_rate columns to files table."""
    # Add new columns for currency conversion tracking
    op.add_column("files", sa.Column("converted_total", sa.Numeric(10, 2), nullable=True))
    op.add_column("files", sa.Column("exchange_rate", sa.Numeric(10, 6), nullable=True))

    # Add indexes for the new columns
    op.create_index(op.f("ix_files_converted_total"), "files", ["converted_total"], unique=False)
    op.create_index(op.f("ix_files_exchange_rate"), "files", ["exchange_rate"], unique=False)

    # Add index for status column
    op.create_index(op.f("ix_files_status"), "files", ["status"], unique=False)


def downgrade() -> None:
    """Remove converted_total and exchange_rate columns from files table."""
    # Remove indexes
    op.drop_index(op.f("ix_files_status"), table_name="files")
    op.drop_index(op.f("ix_files_exchange_rate"), table_name="files")
    op.drop_index(op.f("ix_files_converted_total"), table_name="files")

    # Remove columns
    op.drop_column("files", "exchange_rate")
    op.drop_column("files", "converted_total")
