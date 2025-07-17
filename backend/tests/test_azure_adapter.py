"""Tests for Azure Document Intelligence adapter."""

import os
from datetime import datetime
from unittest.mock import AsyncMock, Mock, patch

import pytest

from app.azure_adapter import (
    DefaultContent,
    InvoiceData,
    InvoiceDate,
    InvoiceTotal,
    ValueCurrency,
    _extract_from_azure_response,
    extract_invoice,
)


class TestDataClasses:
    """Test cases for the data classes."""

    def test_invoice_data_creation(self):
        """Test InvoiceData creation with robust structure."""
        invoice_data = InvoiceData(
            InvoiceDate=InvoiceDate(value_date=datetime(2025, 1, 15), confidence=0.95),
            InvoiceId=DefaultContent("INV-12345", 0.90),
            InvoiceTotal=InvoiceTotal(
                value_currency=ValueCurrency(amount=914.50, currency_code="USD"), content="914.50", confidence=0.92
            ),
            VendorName=DefaultContent("Test Company Inc.", 0.88),
            VendorAddressRecipient=DefaultContent("123 Main St", 0.85),
        )

        assert invoice_data.InvoiceDate.value_date == datetime(2025, 1, 15)
        assert invoice_data.InvoiceId.content == "INV-12345"
        assert invoice_data.InvoiceTotal.value_currency.amount == 914.50
        assert invoice_data.InvoiceTotal.value_currency.currency_code == "USD"
        assert invoice_data.VendorName.content == "Test Company Inc."

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
        mock_date_field.value_date = datetime(2025, 1, 15)
        mock_date_field.confidence = 0.95

        mock_total_field = Mock()
        mock_value_currency = Mock()
        mock_value_currency.amount = 914.50
        mock_value_currency.currency_code = "USD"
        mock_total_field.value_currency = mock_value_currency
        mock_total_field.content = "$914.50"
        mock_total_field.confidence = 0.92

        mock_vendor_field = Mock()
        mock_vendor_field.content = "Test Company Inc."
        mock_vendor_field.confidence = 0.88

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
        assert result.InvoiceDate.value_date == datetime(2025, 1, 15)
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
        mock_address_field.confidence = 0.85

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
            mock_date_field.value_date = datetime(2025, 1, 15)
            mock_date_field.confidence = 0.95

            mock_total_field = Mock()
            mock_value_currency = Mock()
            mock_value_currency.amount = 914.50
            mock_value_currency.currency_code = "USD"
            mock_total_field.value_currency = mock_value_currency
            mock_total_field.content = "$914.50"
            mock_total_field.confidence = 0.92

            mock_vendor_field = Mock()
            mock_vendor_field.content = "Test Company Inc."
            mock_vendor_field.confidence = 0.88

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
            assert result.InvoiceDate.value_date == datetime(2025, 1, 15)
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


# VCR cassette tests would go here when we have real Azure API calls to record
# @pytest.mark.vcr()
# async def test_extract_invoice_real_api():
#     """Test with real Azure API using VCR cassette."""
#     # This would be used with a real PDF file and Azure credentials
#     # The first run would record the HTTP interactions
#     # Subsequent runs would replay them
#     pass
