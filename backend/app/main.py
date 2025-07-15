"""Invoice Converter API main application."""

import asyncio
import json
import uuid
from collections.abc import AsyncGenerator
from pathlib import Path

from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import File as FileModel
from app.models import Job
from langgraph_nodes.pipeline import get_compiled_pipeline

app = FastAPI(title="Invoice Converter API")

# Mount static files (frontend)
static_path = Path("static")
if static_path.exists():
    app.mount("/static", StaticFiles(directory="static"), name="static")

# In-memory progress storage for SSE
progress_queues: dict[str, asyncio.Queue] = {}


async def execute_pipeline(job_id: str, files: list[dict], target_currency: str):
    """Execute the invoice processing pipeline with progress updates."""
    progress_queue = progress_queues.get(job_id)
    if not progress_queue:
        return

    try:
        # Add timeout for CI environments
        pipeline_timeout = 30  # 30 seconds max for pipeline execution
        # Send initial progress
        await progress_queue.put(
            {
                "job_id": job_id,
                "status": "processing",
                "current_step": "uploading",
                "processed": 0,
                "total": len(files),
                "percentage": 0,
                "message": "Starting pipeline execution",
            }
        )

        # Prepare pipeline input
        pipeline_input = {"job_id": job_id, "files": files, "target_currency": target_currency}

        # Get compiled pipeline
        pipeline = get_compiled_pipeline()

        # Execute pipeline
        await progress_queue.put(
            {
                "job_id": job_id,
                "status": "processing",
                "current_step": "extracting",
                "processed": 0,
                "total": len(files),
                "percentage": 25,
                "message": "Extracting invoice data",
            }
        )

        await asyncio.wait_for(pipeline.ainvoke(pipeline_input), timeout=pipeline_timeout)

        await progress_queue.put(
            {
                "job_id": job_id,
                "status": "processing",
                "current_step": "currency_conversion",
                "processed": len(files),
                "total": len(files),
                "percentage": 75,
                "message": "Converting currencies",
            }
        )

        # Send completion
        await progress_queue.put(
            {
                "job_id": job_id,
                "status": "completed",
                "current_step": "excel_generation",
                "processed": len(files),
                "total": len(files),
                "percentage": 100,
                "message": "Excel report generated successfully",
            }
        )

        # Update database - use proper session management
        db_session = next(get_db())
        try:
            job = db_session.query(Job).filter(Job.job_id == job_id).first()
            if job:
                job.status = "completed"
                job.processed = len(files)
                db_session.commit()
        finally:
            db_session.close()

    except asyncio.TimeoutError:
        # Send timeout error
        await progress_queue.put({"job_id": job_id, "status": "error", "message": "Pipeline execution timed out"})
    except Exception as e:
        # Send error
        await progress_queue.put(
            {"job_id": job_id, "status": "error", "message": f"Pipeline execution failed: {str(e)}"}
        )

        # Update database - use proper session management
        db_session = next(get_db())
        try:
            job = db_session.query(Job).filter(Job.job_id == job_id).first()
            if job:
                job.status = "error"
                db_session.commit()
        finally:
            db_session.close()


async def event_generator(job_id: str) -> AsyncGenerator[str, None]:
    """Generate SSE events for job progress."""
    # Create progress queue for this job
    progress_queue = asyncio.Queue()
    progress_queues[job_id] = progress_queue

    try:
        while True:
            # Wait for progress update
            try:
                progress_data = await asyncio.wait_for(progress_queue.get(), timeout=30.0)
                yield f"data: {json.dumps(progress_data)}\n\n"

                # Break if job is completed or failed
                if progress_data.get("status") in ["completed", "error"]:
                    break

            except asyncio.TimeoutError:
                # Send keepalive
                yield f"data: {json.dumps({'keepalive': True})}\n\n"

    finally:
        # Clean up
        if job_id in progress_queues:
            del progress_queues[job_id]


@app.post("/process-invoices")
async def process_invoices(
    files: list[UploadFile] = File(...), target_currency: str = Form("USD"), db: Session = Depends(get_db)
):
    """Process uploaded invoice files."""
    if len(files) > 100:
        raise HTTPException(status_code=400, detail="Maximum 100 files allowed")

    # Generate job ID
    job_id = str(uuid.uuid4())

    # Create uploads directory
    uploads_dir = Path("uploads")
    uploads_dir.mkdir(exist_ok=True)

    # Save files and prepare file list
    file_list = []
    for upload_file in files:
        # Check file size (1MB limit)
        if upload_file.size and upload_file.size > 1024 * 1024:
            raise HTTPException(status_code=400, detail=f"File {upload_file.filename} exceeds 1MB limit")

        # Read file data
        file_data = await upload_file.read()

        file_list.append({"filename": upload_file.filename, "file_data": file_data})

    # Create database job record
    job = Job(job_id=job_id, status="processing", processed=0, total=len(files))
    db.add(job)

    # Create file records
    for file_info in file_list:
        file_record = FileModel(
            job_id=job_id, filename=file_info["filename"], status="uploaded", target_currency=target_currency
        )
        db.add(file_record)

    db.commit()

    # Start pipeline execution in background
    asyncio.create_task(execute_pipeline(job_id, file_list, target_currency))

    return {"job_id": job_id}


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


@app.get("/download/{job_id}")
async def download_report(job_id: str):
    """Download the generated Excel report."""
    exports_dir = Path("exports")
    export_path = exports_dir / f"{job_id}.xlsx"

    if not export_path.exists():
        raise HTTPException(status_code=404, detail="Report not found")

    return FileResponse(
        path=export_path,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename=f"invoice_report_{job_id}.xlsx",
    )


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "ok"}


@app.get("/")
async def serve_frontend():
    """Serve the frontend application."""
    static_path = Path("static")
    index_path = static_path / "index.html"
    
    if index_path.exists():
        return FileResponse(index_path)
    else:
        return {"message": "Frontend not available. API is running at /health"}
