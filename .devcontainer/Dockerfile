# ExchangeRateMCP Development Container
FROM mcr.microsoft.com/devcontainers/python:3.12

# Install uv for faster Python package management
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /usr/local/bin/

# Install additional system tools for development
RUN apt-get update && apt-get install -y \
    jq \
    && rm -rf /var/lib/apt/lists/*

    # Install Node.js and npm
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs

# Set working directory
WORKDIR /workspace

# Copy project files for dependency installation
COPY pyproject.toml ./
COPY README.md ./
COPY LICENSE ./

# Copy source code
COPY src/ ./src/
COPY server.py ./

# Install the project with dev dependencies using uv
RUN uv pip install --system -e ".[dev]"

# Create cache directory with proper permissions
RUN mkdir -p /home/vscode/.cache && \
    touch /home/vscode/.cache/exchange_rate_cache.json && \
    chown -R vscode:vscode /home/vscode

# Copy remaining project files
COPY tests/ ./tests/
COPY test_*.py ./
COPY CLAUDE.md ./

# Ensure proper ownership of workspace
RUN chown -R vscode:vscode /workspace

# Switch to vscode user
USER vscode

# Configure npm to use user directory and install claude-code
RUN npm config set prefix ~/.npm-global && \
    echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc && \
    export PATH=~/.npm-global/bin:$PATH && \
    npm install -g @anthropic-ai/claude-code

# Set environment variable for Python path
ENV PYTHONPATH=/workspace/src

# Default to interactive bash for seamless development
CMD ["/bin/bash"]
