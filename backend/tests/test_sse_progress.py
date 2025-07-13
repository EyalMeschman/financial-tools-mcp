"""Tests for SSE progress endpoint."""

import json
import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app


@pytest.mark.asyncio
async def test_progress_endpoint_returns_sse_events():
    """Test that progress endpoint returns correct SSE events."""
    job_id = "test-job-123"
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        async with client.stream("GET", f"/progress/{job_id}") as response:
            assert response.status_code == 200
            assert response.headers["content-type"] == "text/event-stream; charset=utf-8"
            assert response.headers["cache-control"] == "no-cache"
            
            events = []
            buffer = ""
            
            async for chunk in response.aiter_text():
                buffer += chunk
                
                # Process complete SSE events (separated by \n\n)
                while "\n\n" in buffer:
                    event_text, buffer = buffer.split("\n\n", 1)
                    
                    if event_text.startswith("data: "):
                        data_line = event_text[6:].strip()  # Remove "data: " prefix
                        if data_line:
                            event_data = json.loads(data_line)
                            events.append(event_data)
                            
                            # Stop after we get the completion event
                            if event_data.get("status") == "completed":
                                break
            
            # Should have 10 processing events + 1 completion event = 11 total
            assert len(events) == 11
            
            # Check processing events
            for i in range(10):
                event = events[i]
                assert event["job_id"] == job_id
                assert event["status"] == "processing"
                assert event["percentage"] == i * 10
            
            # Check completion event
            completion_event = events[10]
            assert completion_event["job_id"] == job_id
            assert completion_event["status"] == "completed"
            assert completion_event["percentage"] == 100