"""Tests for Azure Document Intelligence adapter."""

import os
from unittest.mock import AsyncMock, Mock, patch

import pytest

from app.azure_adapter import (
    DefaultContent,
    InvoiceData,
    InvoiceTotal,
    SimpleInvoiceData,
    ValueCurrency,
    _extract_from_azure_response,
    extract_invoice,
    extract_invoice_simple,
    from_azure_response,
    to_simple_format,
)


class TestDataClasses:
    """Test cases for the data classes."""

    def test_invoice_data_creation(self):
        """Test InvoiceData creation with robust structure."""
        invoice_data = InvoiceData(
            InvoiceDate=DefaultContent("2025-01-15"),
            InvoiceId=DefaultContent("INV-12345"),
            InvoiceTotal=InvoiceTotal(
                value_currency=ValueCurrency(amount=914.50, currency_code="USD"), content="$914.50"
            ),
            VendorName=DefaultContent("Test Company Inc."),
            VendorAddressRecipient=DefaultContent("123 Main St"),
        )

        assert invoice_data.InvoiceDate.content == "2025-01-15"
        assert invoice_data.InvoiceId.content == "INV-12345"
        assert invoice_data.InvoiceTotal.value_currency.amount == 914.50
        assert invoice_data.InvoiceTotal.value_currency.currency_code == "USD"
        assert invoice_data.VendorName.content == "Test Company Inc."

    def test_simple_invoice_data_creation(self):
        """Test SimpleInvoiceData creation."""
        simple_data = SimpleInvoiceData(
            date="2025-01-15", total=914.50, currency="USD", vendor="Test Company Inc.", filename="test_invoice.pdf"
        )

        assert simple_data.date == "2025-01-15"
        assert simple_data.total == 914.50
        assert simple_data.currency == "USD"
        assert simple_data.vendor == "Test Company Inc."
        assert simple_data.filename == "test_invoice.pdf"

    def test_invoice_data_with_none_values(self):
        """Test InvoiceData with None values."""
        invoice_data = InvoiceData(
            InvoiceDate=None, InvoiceId=None, InvoiceTotal=None, VendorName=None, VendorAddressRecipient=None
        )

        assert invoice_data.InvoiceDate is None
        assert invoice_data.InvoiceId is None
        assert invoice_data.InvoiceTotal is None
        assert invoice_data.VendorName is None
        assert invoice_data.VendorAddressRecipient is None


class TestExtractFromAzureResponse:
    """Test cases for Azure response extraction."""

    def test_extract_success(self):
        """Test successful extraction from Azure response."""
        # Mock Azure response structure
        mock_date_field = Mock()
        mock_date_field.content = "2025-01-15"

        mock_total_field = Mock()
        mock_value_currency = Mock()
        mock_value_currency.amount = 914.50
        mock_value_currency.currency_code = "USD"
        mock_total_field.value_currency = mock_value_currency
        mock_total_field.content = "$914.50"

        mock_vendor_field = Mock()
        mock_vendor_field.content = "Test Company Inc."

        mock_fields = {
            "InvoiceDate": mock_date_field,
            "InvoiceTotal": mock_total_field,
            "VendorName": mock_vendor_field,
        }

        mock_document = Mock()
        mock_document.fields = mock_fields

        mock_result = Mock()
        mock_result.documents = [mock_document]

        # Test the function
        result = _extract_from_azure_response(mock_result)

        assert result is not None
        assert result.InvoiceDate.content == "2025-01-15"
        assert result.InvoiceTotal.value_currency.amount == 914.50
        assert result.InvoiceTotal.value_currency.currency_code == "USD"
        assert result.InvoiceTotal.content == "$914.50"
        assert result.VendorName.content == "Test Company Inc."

    def test_extract_no_documents(self):
        """Test handling when no documents in response."""
        mock_result = Mock()
        mock_result.documents = []

        result = _extract_from_azure_response(mock_result)
        assert result is None

    def test_extract_missing_fields(self):
        """Test handling of missing fields."""
        mock_fields = {}  # Empty fields

        mock_document = Mock()
        mock_document.fields = mock_fields

        mock_result = Mock()
        mock_result.documents = [mock_document]

        result = _extract_from_azure_response(mock_result)

        assert result is not None
        assert result.InvoiceDate is None
        assert result.InvoiceId is None
        assert result.InvoiceTotal is None
        assert result.VendorName is None
        assert result.VendorAddressRecipient is None

    def test_extract_vendor_fallback(self):
        """Test vendor extraction fallback to VendorAddressRecipient."""
        mock_address_field = Mock()
        mock_address_field.content = "ABC Corp, 123 Main St"

        mock_fields = {
            "VendorAddressRecipient": mock_address_field,
        }

        mock_document = Mock()
        mock_document.fields = mock_fields

        mock_result = Mock()
        mock_result.documents = [mock_document]

        result = _extract_from_azure_response(mock_result)

        assert result is not None
        assert result.VendorAddressRecipient.content == "ABC Corp, 123 Main St"
        assert result.VendorName is None


class TestConversionHelpers:
    """Test cases for format conversion helpers."""

    def test_to_simple_format_complete(self):
        """Test conversion from full to simple format with all fields."""
        full_data = InvoiceData(
            InvoiceDate=DefaultContent("2025-01-15"),
            InvoiceId=DefaultContent("INV-12345"),
            InvoiceTotal=InvoiceTotal(
                value_currency=ValueCurrency(amount=914.50, currency_code="USD"), content="$914.50"
            ),
            VendorName=DefaultContent("Test Company Inc."),
            VendorAddressRecipient=DefaultContent("123 Main St"),
        )

        result = to_simple_format(full_data, "test_invoice.pdf")

        assert result.date == "2025-01-15"
        assert result.total == 914.50
        assert result.currency == "USD"
        assert result.vendor == "Test Company Inc."  # Should prefer VendorName
        assert result.filename == "test_invoice.pdf"

    def test_to_simple_format_with_fallbacks(self):
        """Test conversion with vendor fallback to address."""
        full_data = InvoiceData(
            InvoiceDate=None,
            InvoiceId=None,
            InvoiceTotal=None,
            VendorName=None,
            VendorAddressRecipient=DefaultContent("ABC Corp, 123 Main St"),
        )

        result = to_simple_format(full_data, "test_invoice.pdf")

        assert result.date is None
        assert result.total is None
        assert result.currency is None
        assert result.vendor == "ABC Corp, 123 Main St"  # Should use address as fallback
        assert result.filename == "test_invoice.pdf"

    def test_to_simple_format_empty(self):
        """Test conversion with empty data."""
        full_data = InvoiceData(
            InvoiceDate=None, InvoiceId=None, InvoiceTotal=None, VendorName=None, VendorAddressRecipient=None
        )

        result = to_simple_format(full_data, "test_invoice.pdf")

        assert result.date is None
        assert result.total is None
        assert result.currency is None
        assert result.vendor is None
        assert result.filename == "test_invoice.pdf"

    def test_from_azure_response_alias(self):
        """Test from_azure_response is working as alias."""
        mock_result = Mock()
        mock_result.documents = []

        result1 = from_azure_response(mock_result)
        result2 = _extract_from_azure_response(mock_result)

        assert result1 == result2  # Both should return None


class TestExtractInvoice:
    """Test cases for the extract_invoice function."""

    @pytest.mark.asyncio
    async def test_missing_credentials(self):
        """Test handling of missing credentials."""
        with patch.dict(os.environ, {}, clear=True):
            result = await extract_invoice("test.pdf")
            assert result is None

    @pytest.mark.asyncio
    async def test_file_not_found(self):
        """Test handling when file doesn't exist."""
        with patch.dict(
            os.environ,
            {
                "AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT": "https://test.cognitiveservices.azure.com/",
                "AZURE_DOCUMENT_INTELLIGENCE_API_KEY": "test-api-key",
            },
        ):
            result = await extract_invoice("nonexistent.pdf")
            assert result is None

    @pytest.mark.asyncio
    @patch("app.azure_adapter.DocumentIntelligenceClient")
    @patch("builtins.open")
    @patch("app.azure_adapter.Path")
    async def test_extract_success(self, mock_path, mock_open, mock_client_class):
        """Test successful invoice extraction."""
        with patch.dict(
            os.environ,
            {
                "AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT": "https://test.cognitiveservices.azure.com/",
                "AZURE_DOCUMENT_INTELLIGENCE_API_KEY": "test-api-key",
            },
        ):
            # Setup file mocks
            mock_path_instance = Mock()
            mock_path_instance.exists.return_value = True
            mock_path_instance.name = "test_invoice.pdf"
            mock_path.return_value = mock_path_instance

            mock_file = Mock()
            mock_file.read.return_value = b"mock pdf data"
            mock_open.return_value.__enter__.return_value = mock_file

            # Setup Azure client mock
            mock_client = AsyncMock()
            mock_client_class.return_value.__aenter__.return_value = mock_client

            # Mock the begin_analyze_document call
            mock_poller = AsyncMock()
            mock_client.begin_analyze_document.return_value = mock_poller

            # Mock successful Azure response
            mock_date_field = Mock()
            mock_date_field.content = "2025-01-15"

            mock_total_field = Mock()
            mock_value_currency = Mock()
            mock_value_currency.amount = 914.50
            mock_value_currency.currency_code = "USD"
            mock_total_field.value_currency = mock_value_currency
            mock_total_field.content = "$914.50"

            mock_vendor_field = Mock()
            mock_vendor_field.content = "Test Company Inc."

            mock_fields = {
                "InvoiceDate": mock_date_field,
                "InvoiceTotal": mock_total_field,
                "VendorName": mock_vendor_field,
            }

            mock_document = Mock()
            mock_document.fields = mock_fields

            mock_result = Mock()
            mock_result.documents = [mock_document]
            mock_poller.result.return_value = mock_result

            # Test the function
            result = await extract_invoice("test_invoice.pdf")

            assert result is not None
            assert result.InvoiceDate.content == "2025-01-15"
            assert result.InvoiceTotal.value_currency.amount == 914.50
            assert result.InvoiceTotal.value_currency.currency_code == "USD"
            assert result.VendorName.content == "Test Company Inc."

            # Verify API was called correctly
            mock_client.begin_analyze_document.assert_called_once_with(
                "prebuilt-invoice", b"mock pdf data", content_type="application/pdf"
            )

    @pytest.mark.asyncio
    @patch("app.azure_adapter.DocumentIntelligenceClient")
    @patch("builtins.open")
    @patch("app.azure_adapter.Path")
    async def test_azure_exception(self, mock_path, mock_open, mock_client_class):
        """Test handling of Azure client exceptions."""
        with patch.dict(
            os.environ,
            {
                "AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT": "https://test.cognitiveservices.azure.com/",
                "AZURE_DOCUMENT_INTELLIGENCE_API_KEY": "test-api-key",
            },
        ):
            # Setup file mocks
            mock_path_instance = Mock()
            mock_path_instance.exists.return_value = True
            mock_path_instance.name = "test_invoice.pdf"
            mock_path.return_value = mock_path_instance

            mock_file = Mock()
            mock_file.read.return_value = b"mock pdf data"
            mock_open.return_value.__enter__.return_value = mock_file

            # Setup Azure client mock to raise exception
            mock_client = AsyncMock()
            mock_client.begin_analyze_document.side_effect = Exception("Azure API error")
            mock_client_class.return_value.__aenter__.return_value = mock_client

            result = await extract_invoice("test_invoice.pdf")
            assert result is None

    @pytest.mark.asyncio
    @patch("app.azure_adapter.extract_invoice")
    async def test_extract_invoice_simple_success(self, mock_extract):
        """Test successful simple extraction."""
        # Mock full extraction result
        full_data = InvoiceData(
            InvoiceDate=DefaultContent("2025-01-15"),
            InvoiceId=DefaultContent("INV-12345"),
            InvoiceTotal=InvoiceTotal(
                value_currency=ValueCurrency(amount=914.50, currency_code="USD"), content="$914.50"
            ),
            VendorName=DefaultContent("Test Company Inc."),
            VendorAddressRecipient=None,
        )
        mock_extract.return_value = full_data

        # Test simple extraction
        result = await extract_invoice_simple("test_invoice.pdf")

        assert result is not None
        assert result.date == "2025-01-15"
        assert result.total == 914.50
        assert result.currency == "USD"
        assert result.vendor == "Test Company Inc."
        assert result.filename == "test_invoice.pdf"

    @pytest.mark.asyncio
    @patch("app.azure_adapter.extract_invoice")
    async def test_extract_invoice_simple_failure(self, mock_extract):
        """Test simple extraction when full extraction fails."""
        mock_extract.return_value = None

        result = await extract_invoice_simple("test_invoice.pdf")
        assert result is None


# VCR cassette tests would go here when we have real Azure API calls to record
# @pytest.mark.vcr()
# async def test_extract_invoice_real_api():
#     """Test with real Azure API using VCR cassette."""
#     # This would be used with a real PDF file and Azure credentials
#     # The first run would record the HTTP interactions
#     # Subsequent runs would replay them
#     pass
