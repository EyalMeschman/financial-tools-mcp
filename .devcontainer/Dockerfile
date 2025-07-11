# ExchangeRateMCP Development Container
FROM mcr.microsoft.com/devcontainers/python:3.12

# Install uv for faster Python package management
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /usr/local/bin/

# Install additional system tools for development
RUN apt-get update && apt-get install -y \
    curl \
    jq \
    tree \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /workspace

# Copy project files for dependency installation
COPY pyproject.toml ./
COPY README.md ./
COPY LICENSE ./

# Copy source code
COPY src/ ./src/
COPY server.py ./

# Install the project with dev dependencies
RUN pip install -e ".[dev]"

# Create cache directory with proper permissions
RUN mkdir -p /home/vscode && \
    touch /home/vscode/.exchange_rate_cache.json && \
    chown -R vscode:vscode /home/vscode

# Copy remaining project files
COPY tests/ ./tests/
COPY test_*.py ./
COPY CLAUDE.md ./

# Ensure proper ownership of workspace
RUN chown -R vscode:vscode /workspace

# Switch to vscode user
USER vscode

# Expose the default MCP port (though MCP typically uses stdio)
EXPOSE 8000

# Set environment variable for Python path
ENV PYTHONPATH=/workspace/src

# Default to interactive bash for seamless development
CMD ["/bin/bash"]
