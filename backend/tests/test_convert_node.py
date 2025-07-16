"""Tests for the convert node."""

import os
from datetime import datetime
from decimal import ROUND_HALF_UP, Decimal
from unittest.mock import patch

import httpx
import pytest
import respx

from app.azure_adapter import InvoiceData, InvoiceDate
from app.currency import reset_circuit_breaker
from langgraph_nodes.convert import run


class TestConvertNode:
    """Test cases for the convert node currency conversion."""

    @pytest.fixture(autouse=True, scope="function")
    async def reset_breaker(self):
        """Reset circuit breaker before and after each test."""
        # Reset before test
        await reset_circuit_breaker()
        yield
        # Reset after test to clean up
        await reset_circuit_breaker()

    def create_mock_invoice(self, date_str: str) -> InvoiceData:
        """Create a mock InvoiceData object for testing."""
        return InvoiceData(
            InvoiceDate=InvoiceDate(value_date=datetime.strptime(date_str, "%Y-%m-%d"), confidence=0.95),
            InvoiceId=None,
            InvoiceTotal=None,
            VendorName=None,
            VendorAddressRecipient=None,
        )

    def create_aligned_mock_invoices(self, files: list) -> list[InvoiceData]:
        """Create mock invoices aligned with files. Uses file invoice_date if available, otherwise uses default."""
        invoices = []
        for file_data in files:
            if "invoice_date" in file_data:
                invoices.append(self.create_mock_invoice(file_data["invoice_date"]))
            else:
                # For files without invoice_date, create a mock with default date
                invoices.append(self.create_mock_invoice("2025-07-01"))
        return invoices

    @pytest.mark.asyncio
    async def test_happy_path_conversion(self):
        """Test successful currency conversion with ILS default."""
        input_data = {
            "job_id": "test-job-123",
            "files": [{"id": "file-1", "invoice_date": "2025-07-01", "src_currency": "USD", "invoice_total": 100.00}],
            "invoices": [self.create_mock_invoice("2025-07-01")],
        }

        expected_response = {"amount": 1.0, "base": "USD", "date": "2025-07-01", "rates": {"ILS": 3.65}}

        with respx.mock:
            respx.get("https://api.frankfurter.app/2025-07-01?from=USD&to=ILS").mock(
                return_value=httpx.Response(200, json=expected_response)
            )

            result = await run(input_data)

            assert result["job_id"] == "test-job-123"
            assert len(result["files"]) == 1

            file_result = result["files"][0]
            assert file_result["exchange_rate"] == 3.65
            assert file_result["converted_total"] == 365.00
            assert "status" not in file_result or file_result["status"] != "failed"

    @pytest.mark.asyncio
    async def test_rounding_edge_cases(self):
        """Test ROUND_HALF_UP rounding for edge cases like 0.005 → 0.01."""
        input_data = {
            "job_id": "test-job-123",
            "files": [
                {
                    "id": "file-1",
                    "invoice_date": "2025-07-01",
                    "src_currency": "USD",
                    "invoice_total": 0.005,  # Edge case for rounding
                }
            ],
            "invoices": [self.create_mock_invoice("2025-07-01")],
        }

        # Rate that will produce 0.005 after multiplication (0.005 * 1.0 = 0.005)
        expected_response = {"amount": 1.0, "base": "USD", "date": "2025-07-01", "rates": {"ILS": 1.0}}

        with respx.mock:
            respx.get("https://api.frankfurter.app/2025-07-01?from=USD&to=ILS").mock(
                return_value=httpx.Response(200, json=expected_response)
            )

            result = await run(input_data)

            file_result = result["files"][0]
            # 0.005 should round up to 0.01 with ROUND_HALF_UP
            assert file_result["converted_total"] == 0.01

    @pytest.mark.asyncio
    async def test_same_currency_no_conversion(self):
        """Test that same source and target currency returns rate 1.0."""
        input_data = {
            "job_id": "test-job-123",
            "target_currency": "USD",
            "files": [{"id": "file-1", "invoice_date": "2025-07-01", "src_currency": "USD", "invoice_total": 100.00}],
            "invoices": [self.create_mock_invoice("2025-07-01")],
        }

        # No API call should be made
        result = await run(input_data)

        file_result = result["files"][0]
        assert file_result["exchange_rate"] == 1.0
        assert file_result["converted_total"] == 100.00

    @pytest.mark.asyncio
    async def test_per_job_target_currency_override(self):
        """Test per-job target currency override."""
        input_data = {
            "job_id": "test-job-123",
            "target_currency": "EUR",  # Override default ILS
            "files": [{"id": "file-1", "invoice_date": "2025-07-01", "src_currency": "USD", "invoice_total": 100.00}],
            "invoices": [self.create_mock_invoice("2025-07-01")],
        }

        expected_response = {"amount": 1.0, "base": "USD", "date": "2025-07-01", "rates": {"EUR": 0.85}}

        with respx.mock:
            respx.get("https://api.frankfurter.app/2025-07-01?from=USD&to=EUR").mock(
                return_value=httpx.Response(200, json=expected_response)
            )

            result = await run(input_data)

            file_result = result["files"][0]
            assert file_result["exchange_rate"] == 0.85
            assert file_result["converted_total"] == 85.00

    @pytest.mark.asyncio
    async def test_environment_variable_fallback(self):
        """Test fallback to DEFAULT_TARGET_CURRENCY environment variable."""
        input_data = {
            "job_id": "test-job-123",
            # No target_currency in job payload
            "files": [{"id": "file-1", "invoice_date": "2025-07-01", "src_currency": "USD", "invoice_total": 100.00}],
            "invoices": [self.create_mock_invoice("2025-07-01")],
        }

        expected_response = {"amount": 1.0, "base": "USD", "date": "2025-07-01", "rates": {"EUR": 0.85}}

        with patch.dict(os.environ, {"DEFAULT_TARGET_CURRENCY": "EUR"}):
            with respx.mock:
                respx.get("https://api.frankfurter.app/2025-07-01?from=USD&to=EUR").mock(
                    return_value=httpx.Response(200, json=expected_response)
                )

                result = await run(input_data)

                file_result = result["files"][0]
                assert file_result["exchange_rate"] == 0.85

    @pytest.mark.asyncio
    async def test_missing_required_fields(self):
        """Test handling of missing required fields."""
        input_data = {
            "job_id": "test-job-123",
            "files": [
                {
                    "id": "file-1",
                    # Missing invoice_date
                    "src_currency": "USD",
                    "invoice_total": 100.00,
                },
                {
                    "id": "file-2",
                    "invoice_date": "2025-07-01",
                    # Missing src_currency
                    "invoice_total": 100.00,
                },
                {
                    "id": "file-3",
                    "invoice_date": "2025-07-01",
                    "src_currency": "USD"
                    # Missing invoice_total
                },
            ],
            "invoices": self.create_aligned_mock_invoices(
                [
                    {
                        "id": "file-1",
                        # Missing invoice_date
                        "src_currency": "USD",
                        "invoice_total": 100.00,
                    },
                    {
                        "id": "file-2",
                        "invoice_date": "2025-07-01",
                        # Missing src_currency
                        "invoice_total": 100.00,
                    },
                    {
                        "id": "file-3",
                        "invoice_date": "2025-07-01",
                        "src_currency": "USD"
                        # Missing invoice_total
                    },
                ]
            ),
        }

        result = await run(input_data)

        # All files should be marked as failed
        for file_result in result["files"]:
            assert file_result["status"] == "failed"
            assert "Missing required fields" in file_result["error"]

    @pytest.mark.asyncio
    async def test_api_failure_individual_file(self):
        """Test that API failure marks individual file as failed but continues processing others."""
        input_data = {
            "job_id": "test-job-123",
            "files": [
                {"id": "file-1", "invoice_date": "2025-07-01", "src_currency": "USD", "invoice_total": 100.00},
                {"id": "file-2", "invoice_date": "2025-07-01", "src_currency": "EUR", "invoice_total": 85.00},
            ],
            "invoices": [
                self.create_mock_invoice("2025-07-01"),
                self.create_mock_invoice("2025-07-01"),
            ],
        }

        with respx.mock:
            # First request fails
            respx.get("https://api.frankfurter.app/2025-07-01?from=USD&to=ILS").mock(
                return_value=httpx.Response(500, text="Internal Server Error")
            )

            # Second request succeeds
            respx.get("https://api.frankfurter.app/2025-07-01?from=EUR&to=ILS").mock(
                return_value=httpx.Response(
                    200, json={"amount": 1.0, "base": "EUR", "date": "2025-07-01", "rates": {"ILS": 4.0}}
                )
            )

            result = await run(input_data)

            # First file should be failed
            file1 = result["files"][0]
            assert file1["status"] == "failed"
            assert "Currency conversion failed" in file1["error"]

            # Second file should succeed
            file2 = result["files"][1]
            assert file2.get("status") != "failed"
            assert file2["exchange_rate"] == 4.0
            assert file2["converted_total"] == 340.00

    @pytest.mark.asyncio
    async def test_circuit_breaker_failure(self):
        """Test that circuit breaker failures are handled gracefully."""
        # Ensure clean state at start of test
        await reset_circuit_breaker()

        input_data = {
            "job_id": "test-job-123",
            "files": [{"id": "file-1", "invoice_date": "2025-07-01", "src_currency": "USD", "invoice_total": 100.00}],
            "invoices": [self.create_mock_invoice("2025-07-01")],
        }

        with respx.mock:
            # Simulate multiple failures to trigger circuit breaker
            respx.get("https://api.frankfurter.app/2025-07-01?from=USD&to=ILS").mock(
                return_value=httpx.Response(500, text="Internal Server Error")
            )

            # First two failures
            for _ in range(2):
                result = await run(input_data.copy())
                assert result["files"][0]["status"] == "failed"

            # Third call should trigger circuit breaker
            result = await run(input_data.copy())
            file_result = result["files"][0]
            assert file_result["status"] == "failed"
            assert "Frankfurter API is down" in file_result["error"]

    @pytest.mark.asyncio
    async def test_circuit_breaker_recovery(self):
        """Test that circuit breaker resets after successful call."""
        from app.currency import get_failure_count

        # Ensure clean state at start of test
        await reset_circuit_breaker()

        # Use different dates to avoid mock URL conflicts
        fail_input = {
            "job_id": "test-job-123",
            "files": [{"id": "file-1", "invoice_date": "2025-07-01", "src_currency": "USD", "invoice_total": 100.00}],
            "invoices": [self.create_mock_invoice("2025-07-01")],
        }

        success_input = {
            "job_id": "test-job-123",
            "files": [
                {
                    "id": "file-1",
                    "invoice_date": "2025-07-02",  # Different date
                    "src_currency": "USD",
                    "invoice_total": 100.00,
                }
            ],
            "invoices": [self.create_mock_invoice("2025-07-02")],
        }

        # Verify circuit breaker starts clean
        assert await get_failure_count() == 0

        # First call fails
        with respx.mock(assert_all_called=False) as respx_mock:
            respx_mock.get("https://api.frankfurter.app/2025-07-01?from=USD&to=ILS").mock(
                return_value=httpx.Response(500, text="Internal Server Error")
            )

            result = await run(fail_input)
            assert result["files"][0]["status"] == "failed"

        # Check that failure was recorded
        failure_count = await get_failure_count()
        assert failure_count == 1

        # Second call succeeds - should reset circuit breaker
        with respx.mock(assert_all_called=False) as respx_mock:
            respx_mock.get("https://api.frankfurter.app/2025-07-02?from=USD&to=ILS").mock(
                return_value=httpx.Response(
                    200, json={"amount": 1.0, "base": "USD", "date": "2025-07-02", "rates": {"ILS": 3.65}}
                )
            )

            result = await run(success_input)
            file_result = result["files"][0]
            assert file_result.get("status") != "failed"
            assert file_result["exchange_rate"] == 3.65

        # Verify circuit breaker was reset to 0 on success
        assert await get_failure_count() == 0

    @pytest.mark.asyncio
    async def test_multiple_files_mixed_results(self):
        """Test processing multiple files with mixed success/failure results."""
        # Ensure clean state at start of test
        await reset_circuit_breaker()

        input_data = {
            "job_id": "test-job-123",
            "files": [
                {"id": "file-1", "invoice_date": "2025-07-01", "src_currency": "USD", "invoice_total": 100.00},
                {
                    "id": "file-2",
                    # Missing invoice_date - should fail
                    "src_currency": "EUR",
                    "invoice_total": 85.00,
                },
                {"id": "file-3", "invoice_date": "2025-07-01", "src_currency": "GBP", "invoice_total": 75.00},
            ],
            "invoices": self.create_aligned_mock_invoices(
                [
                    {"id": "file-1", "invoice_date": "2025-07-01", "src_currency": "USD", "invoice_total": 100.00},
                    {
                        "id": "file-2",
                        # Missing invoice_date - should fail
                        "src_currency": "EUR",
                        "invoice_total": 85.00,
                    },
                    {"id": "file-3", "invoice_date": "2025-07-01", "src_currency": "GBP", "invoice_total": 75.00},
                ]
            ),
        }

        with respx.mock(assert_all_called=False) as respx_mock:
            # USD conversion succeeds
            respx_mock.get("https://api.frankfurter.app/2025-07-01?from=USD&to=ILS").mock(
                return_value=httpx.Response(
                    200, json={"amount": 1.0, "base": "USD", "date": "2025-07-01", "rates": {"ILS": 3.65}}
                )
            )

            # GBP conversion succeeds
            respx_mock.get("https://api.frankfurter.app/2025-07-01?from=GBP&to=ILS").mock(
                return_value=httpx.Response(
                    200, json={"amount": 1.0, "base": "GBP", "date": "2025-07-01", "rates": {"ILS": 4.5}}
                )
            )

            result = await run(input_data)

            # File 1: Success
            file1 = result["files"][0]
            assert file1.get("status") != "failed"
            assert file1["exchange_rate"] == 3.65
            assert file1["converted_total"] == 365.00

            # File 2: Failed due to missing date
            file2 = result["files"][1]
            assert file2["status"] == "failed"
            assert "Missing required fields" in file2["error"]

            # File 3: Success
            file3 = result["files"][2]
            assert file3.get("status") != "failed"
            assert file3["exchange_rate"] == 4.5
            assert file3["converted_total"] == 337.50

    @pytest.mark.asyncio
    async def test_precision_and_rounding(self):
        """Test precise decimal calculations and ROUND_HALF_UP rounding."""
        # Ensure clean state at start of test
        await reset_circuit_breaker()

        input_data = {
            "job_id": "test-job-123",
            "files": [
                {
                    "id": "file-1",
                    "invoice_date": "2025-07-01",
                    "src_currency": "USD",
                    "invoice_total": 123.456,  # Will test precision
                }
            ],
            "invoices": [self.create_mock_invoice("2025-07-01")],
        }

        # Rate that will produce fractional result requiring rounding
        expected_response = {"amount": 1.0, "base": "USD", "date": "2025-07-01", "rates": {"ILS": 3.333}}

        with respx.mock(assert_all_called=False) as respx_mock:
            respx_mock.get("https://api.frankfurter.app/2025-07-01?from=USD&to=ILS").mock(
                return_value=httpx.Response(200, json=expected_response)
            )

            result = await run(input_data)

            file_result = result["files"][0]
            # Currency service returns Decimal("3.333") without rounding
            # Then 123.456 * 3.333 = 411.480048, which rounds to 411.48 (ROUND_HALF_UP)
            rate = Decimal("3.333")
            expected_converted = (Decimal("123.456") * rate).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            assert file_result["converted_total"] == float(expected_converted)
            assert file_result["exchange_rate"] == float(rate)
