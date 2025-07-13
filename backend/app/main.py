"""Invoice Converter API main application."""

from fastapi import FastAPI

app = FastAPI(title="Invoice Converter API")


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "ok"}