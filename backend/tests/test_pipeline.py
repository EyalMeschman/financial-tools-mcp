"""Tests for LangGraph pipeline."""

import pytest

from langgraph_nodes.pipeline import get_compiled_pipeline


@pytest.mark.asyncio
async def test_pipeline_noop():
    """Test that pipeline passes data through unchanged."""
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
    
    # Assert output is identical to input
    assert result == sample_input