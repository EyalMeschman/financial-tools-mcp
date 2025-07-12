"""Tests for the Azure Document Intelligence invoice extractor."""

import os
from unittest.mock import Mock, patch

from src.extractors.invoice_extractor import (
    DefaultContent,
    InvoiceData,
    InvoiceTotal,
    ValueCurrency,
    check_usage_quota,
    extract_invoice_data_azure,
    from_azure_response,
)


class TestInvoiceData:
    """Test cases for the InvoiceData dataclass."""

    def test_from_azure_response_success(self):
        """Test successful creation from Azure response."""
        # Mock Azure response structure
        mock_field = DefaultContent("08/07/2025")
        mock_invoice_id = DefaultContent("02/021163")
        mock_total = InvoiceTotal(value_currency=ValueCurrency(amount=914.0, currency_code="ILS"), content="")
        mock_vendor = DefaultContent("Vendor Mock Name")
        mock_address = DefaultContent("123 Test St")

        mock_fields = {
            "InvoiceDate": mock_field,
            "InvoiceId": mock_invoice_id,
            "InvoiceTotal": mock_total,
            "VendorName": mock_vendor,
            "VendorAddressRecipient": mock_address,
        }

        mock_document = Mock()
        mock_document.fields = mock_fields

        mock_result = Mock()
        mock_result.documents = [mock_document]

        # Test the function
        result = from_azure_response(mock_result)

        assert result is not None
        assert result.InvoiceDate.content == "08/07/2025"
        assert result.InvoiceId.content == "02/021163"
        assert result.InvoiceTotal.value_currency.amount == 914.0
        assert result.InvoiceTotal.value_currency.currency_code == "ILS"
        assert result.VendorName.content == "Vendor Mock Name"
        assert result.VendorAddressRecipient.content == "123 Test St"

    def test_from_azure_response_no_documents(self):
        """Test handling when no documents in response."""
        mock_result = Mock()
        mock_result.documents = []

        result = from_azure_response(mock_result)
        assert result is None

    def test_from_azure_response_missing_fields(self):
        """Test handling of missing fields."""
        mock_fields = {}  # Empty fields

        mock_document = Mock()
        mock_document.fields = mock_fields

        mock_result = Mock()
        mock_result.documents = [mock_document]

        result = from_azure_response(mock_result)

        assert result is not None
        assert result.InvoiceDate.content == ""
        assert result.InvoiceId.content == ""
        assert result.InvoiceTotal.value_currency.amount == 0
        assert result.InvoiceTotal.value_currency.currency_code == ""
        assert result.VendorName.content == ""
        assert result.VendorAddressRecipient.content == ""

    def test_invoice_data_creation(self):
        """Test InvoiceData creation with new structure."""
        invoice_data = InvoiceData(
            InvoiceDate=DefaultContent("08/07/2025"),
            InvoiceId=DefaultContent("02/021163"),
            InvoiceTotal=InvoiceTotal(value_currency=ValueCurrency(amount=914.0, currency_code="ILS"), content=""),
            VendorName=DefaultContent("Test Company"),
            VendorAddressRecipient=DefaultContent("123 Test St"),
        )

        assert invoice_data.InvoiceDate.content == "08/07/2025"
        assert invoice_data.InvoiceId.content == "02/021163"
        assert invoice_data.InvoiceTotal.value_currency.amount == 914.0
        assert invoice_data.InvoiceTotal.value_currency.currency_code == "ILS"
        assert invoice_data.VendorName.content == "Test Company"
        assert invoice_data.VendorAddressRecipient.content == "123 Test St"


class TestExtractInvoiceDataAzure:
    """Test cases for the extract_invoice_data_azure function."""

    @patch.dict(
        os.environ,
        {
            "AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT": "https://test.cognitiveservices.azure.com/",
            "AZURE_DOCUMENT_INTELLIGENCE_API_KEY": "test-api-key",
        },
    )
    @patch("src.extractors.invoice_extractor.DocumentIntelligenceClient")
    @patch("builtins.open", create=True)
    @patch("src.extractors.invoice_extractor.Path")
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
        mock_field = DefaultContent("08/07/2025")
        mock_invoice_id = DefaultContent("02/021163")
        mock_total = InvoiceTotal(value_currency=ValueCurrency(amount=914.0, currency_code="ILS"), content="")
        mock_vendor = DefaultContent("Test Company")
        mock_address = DefaultContent("123 Test St")

        mock_fields = {
            "InvoiceDate": mock_field,
            "InvoiceId": mock_invoice_id,
            "InvoiceTotal": mock_total,
            "VendorName": mock_vendor,
            "VendorAddressRecipient": mock_address,
        }

        mock_document = Mock()
        mock_document.fields = mock_fields

        mock_result = Mock()
        mock_result.documents = [mock_document]
        mock_poller.result.return_value = mock_result

        # Test the function
        result = extract_invoice_data_azure("test.pdf")

        assert result is not None
        assert result.InvoiceDate.content == "08/07/2025"
        assert result.InvoiceId.content == "02/021163"
        assert result.InvoiceTotal.value_currency.amount == 914.0
        assert result.InvoiceTotal.value_currency.currency_code == "ILS"
        assert result.VendorName.content == "Test Company"
        assert result.VendorAddressRecipient.content == "123 Test St"

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
    @patch("src.extractors.invoice_extractor.DocumentIntelligenceClient")
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
