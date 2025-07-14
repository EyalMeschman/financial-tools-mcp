"""Tests for the excel node."""

from io import BytesIO

import pytest
from openpyxl import load_workbook

from app.azure_adapter import DefaultContent, InvoiceData, InvoiceTotal, ValueCurrency
from langgraph_nodes import excel


class TestExcelNode:
    """Test cases for the excel node."""

    def test_module_imports(self):
        """Test that the excel module imports successfully."""
        assert excel is not None

    def test_invoice_suffix_helper(self):
        """Test the invoice_suffix helper function."""
        # Test with extension
        assert excel.invoice_suffix(None, "invoice.pdf") == "invoice"
        assert excel.invoice_suffix(None, "test_file.xlsx") == "test_file"

        # Test without extension
        assert excel.invoice_suffix(None, "invoice") == "invoice"

        # Test empty filename
        assert excel.invoice_suffix(None, "") == ""

        # Test None filename
        assert excel.invoice_suffix(None, None) == ""

    @pytest.mark.asyncio
    async def test_run_with_empty_invoices(self):
        """Test run function with empty invoice list."""
        result = await excel.run({})

        # Check return structure
        assert isinstance(result, dict)
        assert "xlsx" in result
        assert "row_count" in result
        assert isinstance(result["xlsx"], bytes)
        assert result["row_count"] == 1  # One ERROR row

        # Validate Excel content
        excel_data = BytesIO(result["xlsx"])
        wb = load_workbook(excel_data)
        ws = wb.active

        # Check headers
        expected_headers = [
            "Invoice ID",
            "Date",
            "Vendor Name",
            "Vendor Address",
            "Amount",
            "Currency",
            "Total Content",
            "Filename",
        ]
        for col, expected_header in enumerate(expected_headers, 1):
            assert ws.cell(row=1, column=col).value == expected_header

        # Check ERROR row
        for col in range(1, len(expected_headers) + 1):
            assert ws.cell(row=2, column=col).value == "ERROR"

    @pytest.mark.asyncio
    async def test_run_with_complete_invoice(self):
        """Test run function with a complete invoice."""
        # Create test invoice data
        invoice = InvoiceData(
            InvoiceId=DefaultContent(content="INV-001"),
            InvoiceDate=DefaultContent(content="2024-01-15"),
            VendorName=DefaultContent(content="Acme Corp"),
            VendorAddressRecipient=DefaultContent(content="123 Business St"),
            InvoiceTotal=InvoiceTotal(
                value_currency=ValueCurrency(amount=1234.56, currency_code="USD"), content="$1,234.56"
            ),
        )

        # Add filename attribute for testing
        invoice._filename = "test_invoice.pdf"

        result = await excel.run({"invoices": [invoice]})

        # Check return structure
        assert isinstance(result, dict)
        assert "xlsx" in result
        assert "row_count" in result
        assert isinstance(result["xlsx"], bytes)
        assert result["row_count"] == 1

        # Validate Excel content
        excel_data = BytesIO(result["xlsx"])
        wb = load_workbook(excel_data)
        ws = wb.active

        # Check data row
        assert ws.cell(row=2, column=1).value == "INV-001"  # Invoice ID
        assert ws.cell(row=2, column=2).value == "2024-01-15"  # Date
        assert ws.cell(row=2, column=3).value == "Acme Corp"  # Vendor Name
        assert ws.cell(row=2, column=4).value == "123 Business St"  # Vendor Address
        assert ws.cell(row=2, column=5).value == 1234.56  # Amount
        assert ws.cell(row=2, column=6).value == "USD"  # Currency
        assert ws.cell(row=2, column=7).value == "$1,234.56"  # Total Content
        assert ws.cell(row=2, column=8).value == "test_invoice"  # Filename

    @pytest.mark.asyncio
    async def test_run_with_partial_invoice(self):
        """Test run function with partial invoice data (missing fields)."""
        # Create invoice with missing fields
        invoice = InvoiceData(
            InvoiceId=DefaultContent(content="INV-002"),
            InvoiceDate=None,  # Missing date
            VendorName=DefaultContent(content="Test Vendor"),
            VendorAddressRecipient=None,  # Missing address
            InvoiceTotal=None,  # Missing total
        )

        result = await excel.run({"invoices": [invoice]})

        # Validate Excel content
        excel_data = BytesIO(result["xlsx"])
        wb = load_workbook(excel_data)
        ws = wb.active

        # Check data row with ERROR placeholders
        assert ws.cell(row=2, column=1).value == "INV-002"  # Invoice ID
        assert ws.cell(row=2, column=2).value == "ERROR"  # Date (missing)
        assert ws.cell(row=2, column=3).value == "Test Vendor"  # Vendor Name
        assert ws.cell(row=2, column=4).value == "ERROR"  # Vendor Address (missing)
        assert ws.cell(row=2, column=5).value == "ERROR"  # Amount (missing)
        assert ws.cell(row=2, column=6).value == "ERROR"  # Currency (missing)
        assert ws.cell(row=2, column=7).value == "ERROR"  # Total Content (missing)
        filename_cell_value = ws.cell(row=2, column=8).value
        assert filename_cell_value == "" or filename_cell_value is None  # Filename (empty)

    @pytest.mark.asyncio
    async def test_run_with_multiple_invoices(self):
        """Test run function with multiple invoices."""
        # Create multiple test invoices
        invoice1 = InvoiceData(
            InvoiceId=DefaultContent(content="INV-001"),
            InvoiceDate=DefaultContent(content="2024-01-15"),
            VendorName=DefaultContent(content="Vendor A"),
            VendorAddressRecipient=DefaultContent(content="Address A"),
            InvoiceTotal=InvoiceTotal(
                value_currency=ValueCurrency(amount=100.0, currency_code="USD"), content="$100.00"
            ),
        )

        invoice2 = InvoiceData(
            InvoiceId=DefaultContent(content="INV-002"),
            InvoiceDate=DefaultContent(content="2024-01-16"),
            VendorName=DefaultContent(content="Vendor B"),
            VendorAddressRecipient=DefaultContent(content="Address B"),
            InvoiceTotal=InvoiceTotal(
                value_currency=ValueCurrency(amount=200.0, currency_code="EUR"), content="€200.00"
            ),
        )

        result = await excel.run({"invoices": [invoice1, invoice2]})

        # Check return structure
        assert result["row_count"] == 2

        # Validate Excel content
        excel_data = BytesIO(result["xlsx"])
        wb = load_workbook(excel_data)
        ws = wb.active

        # Check first invoice
        assert ws.cell(row=2, column=1).value == "INV-001"
        assert ws.cell(row=2, column=6).value == "USD"

        # Check second invoice
        assert ws.cell(row=3, column=1).value == "INV-002"
        assert ws.cell(row=3, column=6).value == "EUR"

    @pytest.mark.asyncio
    async def test_excel_formatting(self):
        """Test that Excel file has proper formatting."""
        invoice = InvoiceData(
            InvoiceId=DefaultContent(content="INV-001"),
            InvoiceDate=DefaultContent(content="2024-01-15"),
            VendorName=DefaultContent(content="Test Vendor"),
            VendorAddressRecipient=DefaultContent(content="Test Address"),
            InvoiceTotal=InvoiceTotal(
                value_currency=ValueCurrency(amount=100.0, currency_code="USD"), content="$100.00"
            ),
        )

        result = await excel.run({"invoices": [invoice]})

        # Validate Excel formatting
        excel_data = BytesIO(result["xlsx"])
        wb = load_workbook(excel_data)
        ws = wb.active

        # Check that worksheet has correct title
        assert ws.title == "Invoice Report"

        # Check header formatting (basic checks)
        header_cell = ws.cell(row=1, column=1)
        assert header_cell.value == "Invoice ID"
        assert header_cell.font.bold is True
        assert header_cell.font.color.rgb == "00FFFFFF"
