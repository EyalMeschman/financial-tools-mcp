"""Invoice Converter API main application."""

import asyncio
import json
from collections.abc import AsyncGenerator

from fastapi import FastAPI
from fastapi.responses import StreamingResponse

app = FastAPI(title="Invoice Converter API")


async def event_generator(job_id: str) -> AsyncGenerator[str, None]:
    """Generate SSE events for job progress."""
    for i in range(10):
        percentage = i * 10
        event_data = {"job_id": job_id, "status": "processing", "percentage": percentage}
        yield f"data: {json.dumps(event_data)}\n\n"
        await asyncio.sleep(1)

    # Send completion event
    completion_data = {"job_id": job_id, "status": "completed", "percentage": 100}
    yield f"data: {json.dumps(completion_data)}\n\n"


@app.get("/progress/{job_id}")
async def get_progress(job_id: str):
    """SSE endpoint for job progress updates."""
    return StreamingResponse(
        event_generator(job_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "ok"}
