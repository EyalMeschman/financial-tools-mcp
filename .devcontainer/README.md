# ExchangeRateMCP Development Container

This directory contains the development container configuration for the ExchangeRateMCP project.

## Features

- **Python 3.12.6** environment
- **Pre-configured VS Code extensions** for Python development
- **Automatic dependency installation** via pip
- **Persistent exchange rate cache** across container restarts
- **Git and GitHub CLI** pre-installed

## Quick Start

### Using VS Code Dev Containers

1. Install the **Dev Containers** extension in VS Code
2. Open this project in VS Code
3. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
4. Select "Dev Containers: Reopen in Container"
5. Wait for the container to build and start

### Using Docker Compose

```bash
# Build and start the development environment
docker-compose -f .devcontainer/docker-compose.yml up -d

# Enter the container
docker-compose -f .devcontainer/docker-compose.yml exec exchange-rate-mcp bash

# Run tests
pytest tests/ -v

# Run the MCP server
python server.py
```

## Included Extensions

- **Python** - Full Python language support
- **Pylance** - Advanced Python language server
- **Black Formatter** - Code formatting
- **Ruff** - Fast Python linter
- **Pytest** - Test framework support
- **Docker** - Container management
- **GitLens** - Enhanced Git capabilities
- **GitHub Copilot** - AI pair programming

## Volume Mounts

- **Source Code**: Your project files are mounted at `/workspace`
- **Cache**: Exchange rate cache is persisted in a Docker volume

## Environment

- **Working Directory**: `/workspace`
- **Python Path**: Includes `/workspace/src`
- **Cache Location**: `/home/vscode/.exchange_rate_cache.json`

## Testing the Setup

Once the container is running, you can test the ExchangeRateMCP:

```bash
# Run all tests
pytest tests/ -v

# Test the exchange rate function
python -c "
from src.exchange_rate_mcp.tools import mcp
print('ExchangeRateMCP loaded successfully!')
"

# Run the MCP server
python server.py
```
