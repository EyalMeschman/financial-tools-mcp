#!/usr/bin/env python3
"""MCP Server entry point for ExchangeRateMCP."""

import os
import sys

# Add the src directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))

from exchange_rate_mcp.tools import mcp

if __name__ == "__main__":
    mcp.run()
