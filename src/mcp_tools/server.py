#!/usr/bin/env python3
"""MCP Server entry point for Financial Tools MCP."""

import os
import sys

# Add the src directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from src.mcp_tools.exchange_rate import mcp

if __name__ == "__main__":
    mcp.run()
