# McpServer Development Container
FROM mcr.microsoft.com/devcontainers/python:3.12

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /usr/local/bin/

# Set working directory
WORKDIR /workspace

# Create cache directory
RUN mkdir -p /home/vscode && \
    touch /home/vscode/.exchange_rate_cache.json && \
    chown -R vscode:vscode /home/vscode

# Expose the default MCP port (though MCP typically uses stdio)
EXPOSE 8000

# Set the default command to run the MCP server
CMD ["python", "server.py"]
