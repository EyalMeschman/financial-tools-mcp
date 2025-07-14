"""Tests for SSE progress endpoint."""


import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.skip(reason="SSE test can hang in CI - requires active progress queue")
@pytest.mark.asyncio
async def test_progress_endpoint_returns_sse_events():
    """Test that progress endpoint returns correct SSE events."""
    job_id = "test-job-123"

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        async with client.stream("GET", f"/progress/{job_id}") as response:
            assert response.status_code == 200
            assert response.headers["content-type"] == "text/event-stream; charset=utf-8"
            assert response.headers["cache-control"] == "no-cache"


def test_progress_endpoint_basic():
    """Test basic progress endpoint response structure."""
    from fastapi.testclient import TestClient

    client = TestClient(app)
    job_id = "test-job-123"

    # Just test that the endpoint exists and returns the right headers
    with client.stream("GET", f"/progress/{job_id}") as response:
        assert response.status_code == 200
        assert "text/event-stream" in response.headers["content-type"]
        assert response.headers["cache-control"] == "no-cache"
