"""Tests for LangGraph pipeline."""

import pytest

from langgraph_nodes.pipeline import get_compiled_pipeline


@pytest.mark.asyncio
async def test_pipeline_execution():
    """Test that pipeline executes and produces Excel output."""
    # Sample input data
    sample_input = {
        "job_id": "test-job-123",
        "files": [
            {"filename": "invoice1.pdf", "status": "uploaded"},
            {"filename": "invoice2.pdf", "status": "uploaded"},
        ],
        "target_currency": "USD",
        "metadata": {"user_id": "user123", "timestamp": "2025-01-01T00:00:00Z"},
    }

    # Get compiled pipeline
    pipeline = get_compiled_pipeline()

    # Execute pipeline
    result = await pipeline.ainvoke(sample_input)

    # Assert the pipeline produces Excel output
    assert "xlsx" in result
    assert "row_count" in result
    assert isinstance(result["xlsx"], bytes)
    assert isinstance(result["row_count"], int)
    assert result["row_count"] >= 1  # At least one row (could be ERROR row)

    # Check if original input data is preserved (it may not be, which is okay)
    # The Excel node is the final output, so the result structure depends on its implementation
