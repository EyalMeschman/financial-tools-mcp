# Stage 1: Build frontend
FROM node:18-alpine AS frontend-builder

# Set working directory
WORKDIR /app

# Copy frontend package files
COPY frontend/package*.json ./
RUN npm ci

# Copy frontend source
COPY frontend/ ./

# Build frontend
RUN npm run build

# Stage 2: Python runtime
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements
COPY backend/pyproject.toml backend/poetry.lock* backend/poetry.toml ./

# Install Poetry and dependencies
RUN pip install poetry && \
    poetry config virtualenvs.create false && \
    poetry install --without dev,proto --no-interaction --no-ansi --no-root

# Copy backend application code
COPY backend/app/ ./app/
COPY backend/langgraph_nodes/ ./langgraph_nodes/
COPY backend/alembic/ ./alembic/
COPY backend/alembic.ini ./

# Copy built frontend static files
COPY --from=frontend-builder /app/dist/ ./static/

# Create necessary directories
RUN mkdir -p uploads exports

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:80/health || exit 1

# Run database migrations and start server
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 80"]