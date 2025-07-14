"""Stub tests for the excel node."""

import pytest

from langgraph_nodes import excel


class TestExcelNode:
    """Stub test cases for the excel node to maintain coverage."""

    def test_module_imports(self):
        """Test that the excel module imports successfully."""
        assert excel is not None

    @pytest.mark.asyncio
    async def test_run_function_exists(self):
        """Test that the public run() coroutine exists."""
        assert hasattr(excel, 'run')
        assert callable(excel.run)
        
        # Test that it can be called with empty input (placeholder behavior)
        result = await excel.run({})
        assert isinstance(result, dict)