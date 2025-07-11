"""Tests for the Azure Document Intelligence invoice extractor."""

import os
from unittest.mock import Mock, patch

from extractors.invoice_extractor import (
    InvoiceData,
    check_usage_quota,
    extract_invoice_data_azure,
)


class TestInvoiceData:
    """Test cases for the InvoiceData dataclass."""

    def test_from_azure_response_success(self):
        """Test successful creation from Azure response."""
        # Mock Azure response structure
        mock_field = Mock()
        mock_field.content = "08/07/2025"

        mock_invoice_id = Mock()
        mock_invoice_id.content = "02/021163"

        mock_total = Mock()
        mock_total.value_currency = Mock()
        mock_total.value_currency.amount = 914.0
        mock_total.value_currency.currency_code = "ILS"

        mock_vendor = Mock()
        mock_vendor.content = "Vendor Mock Name"

        mock_fields = {
            "InvoiceDate": mock_field,
            "InvoiceId": mock_invoice_id,
            "InvoiceTotal": mock_total,
            "VendorName": mock_vendor,
        }

        mock_document = Mock()
        mock_document.fields = mock_fields

        mock_result = Mock()
        mock_result.documents = [mock_document]

        # Test the method
        result = InvoiceData.from_azure_response(mock_result)

        assert result is not None
        assert result.date == "08/07/2025"
        assert result.invoice_suffix == "1163"  # Last 4 digits of 02/021163
        assert result.price == "914.0"
        assert result.currency == "ILS"
        assert result.company == "Vendor Mock Name"

    def test_from_azure_response_no_documents(self):
        """Test handling when no documents in response."""
        mock_result = Mock()
        mock_result.documents = []

        result = InvoiceData.from_azure_response(mock_result)
        assert result is None

    def test_from_azure_response_missing_fields(self):
        """Test handling of missing fields."""
        mock_fields = {}  # Empty fields

        mock_document = Mock()
        mock_document.fields = mock_fields

        mock_result = Mock()
        mock_result.documents = [mock_document]

        result = InvoiceData.from_azure_response(mock_result)

        assert result is not None
        assert result.date == "Not found"
        assert result.invoice_suffix == "Not found"
        assert result.price == "Not found"
        assert result.currency == "Unknown"
        assert result.company == "Not found"

    def test_format_price(self):
        """Test price formatting."""
        invoice_data = InvoiceData(date="08/07/2025", invoice_suffix="1163", price="914.0", currency="ILS", company="Test Company")

        assert invoice_data.format_price() == "914.0 ILS"

        # Test with "Not found" price
        invoice_data_not_found = InvoiceData(
            date="08/07/2025", invoice_suffix="1163", price="Not found", currency="ILS", company="Test Company"
        )

        assert invoice_data_not_found.format_price() == "Not found"

    def test_to_dict(self):
        """Test conversion to dictionary."""
        invoice_data = InvoiceData(date="08/07/2025", invoice_suffix="1163", price="914.0", currency="ILS", company="Test Company")

        result = invoice_data.to_dict()

        expected = {"date": "08/07/2025", "invoice_suffix": "1163", "price": "914.0 ILS", "company": "Test Company"}

        assert result == expected


class TestExtractInvoiceDataAzure:
    """Test cases for the extract_invoice_data_azure function."""

    @patch.dict(
        os.environ,
        {
            "AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT": "https://test.cognitiveservices.azure.com/",
            "AZURE_DOCUMENT_INTELLIGENCE_API_KEY": "test-api-key",
        },
    )
    @patch("extractors.invoice_extractor.DocumentIntelligenceClient")
    @patch("builtins.open", create=True)
    @patch("extractors.invoice_extractor.Path")
    def test_extract_success(self, mock_path, mock_open, mock_client_class):
        """Test successful invoice extraction."""
        # Setup mocks
        mock_path.return_value.exists.return_value = True
        mock_open.return_value.__enter__.return_value.read.return_value = b"mock pdf data"

        # Mock Azure client and response
        mock_client = Mock()
        mock_client_class.return_value = mock_client

        mock_poller = Mock()
        mock_client.begin_analyze_document.return_value = mock_poller

        # Mock successful Azure response
        mock_field = Mock()
        mock_field.content = "08/07/2025"

        mock_invoice_id = Mock()
        mock_invoice_id.content = "02/021163"

        mock_total = Mock()
        mock_total.value_currency = Mock()
        mock_total.value_currency.amount = 914.0
        mock_total.value_currency.currency_code = "ILS"

        mock_vendor = Mock()
        mock_vendor.content = "Test Company"

        mock_fields = {
            "InvoiceDate": mock_field,
            "InvoiceId": mock_invoice_id,
            "InvoiceTotal": mock_total,
            "VendorName": mock_vendor,
        }

        mock_document = Mock()
        mock_document.fields = mock_fields

        mock_result = Mock()
        mock_result.documents = [mock_document]
        mock_poller.result.return_value = mock_result

        # Test the function
        result = extract_invoice_data_azure("test.pdf")

        assert result is not None
        assert result.date == "08/07/2025"
        assert result.invoice_suffix == "1163"
        assert result.price == "914.0"
        assert result.currency == "ILS"
        assert result.company == "Test Company"

    def test_missing_credentials(self):
        """Test handling of missing credentials."""
        with patch.dict(os.environ, {}, clear=True):
            result = extract_invoice_data_azure("test.pdf")
            assert result is None

    @patch.dict(
        os.environ,
        {
            "AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT": "https://test.cognitiveservices.azure.com/",
            "AZURE_DOCUMENT_INTELLIGENCE_API_KEY": "test-api-key",
        },
    )
    @patch("extractors.invoice_extractor.DocumentIntelligenceClient")
    @patch("builtins.open", create=True)
    def test_azure_exception(self, mock_open, mock_client_class):
        """Test handling of Azure client exceptions."""
        mock_open.return_value.__enter__.return_value.read.return_value = b"mock pdf data"

        mock_client = Mock()
        mock_client_class.return_value = mock_client
        mock_client.begin_analyze_document.side_effect = Exception("Azure error")

        result = extract_invoice_data_azure("test.pdf")
        assert result is None


class TestCheckUsageQuota:
    """Test cases for the check_usage_quota function."""

    def test_missing_resource_id(self):
        """Test handling when resource ID is not set."""
        with patch.dict(os.environ, {}, clear=True):
            result = check_usage_quota()
            assert result is None

    @patch.dict(
        os.environ,
        {
            "AZURE_DOCUMENT_INTELLIGENCE_RESOURCE_ID": "/subscriptions/test/resourceGroups/test/providers/Microsoft.CognitiveServices/accounts/test"
        },
    )
    @patch("subprocess.run")
    @patch("requests.get")
    def test_successful_quota_check(self, mock_requests_get, mock_subprocess):
        """Test successful quota checking."""
        # Mock subprocess (Azure CLI)
        mock_subprocess.return_value.stdout = "test-token\n"

        # Mock requests response
        mock_response = Mock()
        mock_response.json.return_value = {"value": [{"timeseries": [{"data": [{"total": 50}]}]}]}
        mock_requests_get.return_value = mock_response

        result = check_usage_quota()

        assert result is not None
        assert result["used"] == 50
        assert result["remaining"] == 450
        assert result["total_limit"] == 500

    @patch.dict(
        os.environ,
        {
            "AZURE_DOCUMENT_INTELLIGENCE_RESOURCE_ID": "/subscriptions/test/resourceGroups/test/providers/Microsoft.CognitiveServices/accounts/test"
        },
    )
    @patch("subprocess.run")
    def test_azure_cli_error(self, mock_subprocess):
        """Test handling of Azure CLI errors."""
        mock_subprocess.side_effect = Exception("Azure CLI error")

        result = check_usage_quota()
        assert result is None

    @patch.dict(
        os.environ,
        {
            "AZURE_DOCUMENT_INTELLIGENCE_RESOURCE_ID": "/subscriptions/test/resourceGroups/test/providers/Microsoft.CognitiveServices/accounts/test"
        },
    )
    @patch("subprocess.run")
    @patch("requests.get")
    def test_requests_error(self, mock_requests_get, mock_subprocess):
        """Test handling of requests errors."""
        mock_subprocess.return_value.stdout = "test-token\n"
        mock_requests_get.side_effect = Exception("Network error")

        result = check_usage_quota()
        assert result is None
