"""Azure Document Intelligence adapter for invoice extraction."""

import os
from dataclasses import dataclass
from pathlib import Path

from azure.ai.documentintelligence.aio import DocumentIntelligenceClient
from azure.core.credentials import AzureKeyCredential
from dotenv import load_dotenv

load_dotenv()


# Robust internal dataclasses (preserving original structure)
@dataclass
class DefaultContent:
    """Text content with optional confidence."""

    content: str


@dataclass
class ValueCurrency:
    """Monetary value with currency code."""

    amount: float
    currency_code: str


@dataclass
class InvoiceTotal:
    """Invoice total with structured and text content."""

    value_currency: ValueCurrency | None
    content: str


@dataclass
class InvoiceData:
    """Complete invoice data structure matching Azure response."""

    InvoiceDate: DefaultContent | None
    InvoiceId: DefaultContent | None
    InvoiceTotal: InvoiceTotal | None
    VendorName: DefaultContent | None
    VendorAddressRecipient: DefaultContent | None


# Simple output format for web API
@dataclass
class SimpleInvoiceData:
    """Simplified invoice data structure for API responses."""

    date: str | None = None
    total: float | None = None
    currency: str | None = None
    vendor: str | None = None
    filename: str | None = None


async def extract_invoice(path: str) -> InvoiceData | None:
    """Extract invoice data using Azure Document Intelligence.

    Args:
        path: Path to the invoice file (PDF, JPEG, PNG)

    Returns:
        InvoiceData: Extracted invoice data or None if extraction fails
    """
    # Get credentials from environment
    endpoint = os.getenv("AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT")
    api_key = os.getenv("AZURE_DOCUMENT_INTELLIGENCE_API_KEY")

    if not endpoint or not api_key:
        print("Error: Missing Azure Document Intelligence credentials in .env file")
        print("Required variables:")
        print("- AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT")
        print("- AZURE_DOCUMENT_INTELLIGENCE_API_KEY")
        return None

    # Check if file exists
    file_path = Path(path)
    if not file_path.exists():
        print(f"Error: File '{path}' not found")
        return None

    try:
        # Initialize async client
        async with DocumentIntelligenceClient(endpoint=endpoint, credential=AzureKeyCredential(api_key)) as client:
            # Read file
            with open(path, "rb") as file:
                file_data = file.read()

            print(f"Processing {path} with Azure Document Intelligence...")

            # Analyze document using prebuilt invoice model
            poller = await client.begin_analyze_document("prebuilt-invoice", file_data, content_type="application/pdf")

            result = await poller.result()

            # Extract data from Azure response
            invoice_data = _extract_from_azure_response(result)

            return invoice_data

    except Exception as e:
        print(f"Error processing document: {e}")
        return None


def _extract_from_azure_response(azure_result) -> InvoiceData | None:
    """Extract structured data from Azure Document Intelligence response."""
    if not azure_result.documents:
        return None

    invoice = azure_result.documents[0]
    fields = invoice.fields

    # Extract content from Azure field objects with proper structure
    invoice_date = None
    if "InvoiceDate" in fields and fields["InvoiceDate"]:
        content = getattr(fields["InvoiceDate"], "content", "")
        if content:
            invoice_date = DefaultContent(content=content)

    invoice_id = None
    if "InvoiceId" in fields and fields["InvoiceId"]:
        content = getattr(fields["InvoiceId"], "content", "")
        if content:
            invoice_id = DefaultContent(content=content)

    invoice_total = None
    if "InvoiceTotal" in fields and fields["InvoiceTotal"]:
        total_field = fields["InvoiceTotal"]
        content = getattr(total_field, "content", "")

        value_currency = None
        if hasattr(total_field, "value_currency") and total_field.value_currency:
            amount = getattr(total_field.value_currency, "amount", 0.0)
            currency_code = getattr(total_field.value_currency, "currency_code", "")
            if amount or currency_code:
                value_currency = ValueCurrency(amount=amount, currency_code=currency_code)

        if content or value_currency:
            invoice_total = InvoiceTotal(value_currency=value_currency, content=content)

    vendor_name = None
    if "VendorName" in fields and fields["VendorName"]:
        content = getattr(fields["VendorName"], "content", "")
        if content:
            vendor_name = DefaultContent(content=content)

    vendor_address = None
    if "VendorAddressRecipient" in fields and fields["VendorAddressRecipient"]:
        content = getattr(fields["VendorAddressRecipient"], "content", "")
        if content:
            vendor_address = DefaultContent(content=content)

    return InvoiceData(
        InvoiceDate=invoice_date,
        InvoiceId=invoice_id,
        InvoiceTotal=invoice_total,
        VendorName=vendor_name,
        VendorAddressRecipient=vendor_address,
    )


# Conversion helpers between formats
def to_simple_format(invoice: InvoiceData, filename: str) -> SimpleInvoiceData:
    """Convert full InvoiceData to simplified format for API responses.

    Args:
        invoice: Full structured invoice data
        filename: Original filename

    Returns:
        SimpleInvoiceData: Simplified format for JSON serialization
    """
    # Extract date
    date = None
    if invoice.InvoiceDate and invoice.InvoiceDate.content:
        date = invoice.InvoiceDate.content

    # Extract total and currency
    total = None
    currency = None
    if invoice.InvoiceTotal and invoice.InvoiceTotal.value_currency:
        total = invoice.InvoiceTotal.value_currency.amount
        currency = invoice.InvoiceTotal.value_currency.currency_code

    # Extract vendor (prefer VendorName, fallback to VendorAddressRecipient)
    vendor = None
    if invoice.VendorName and invoice.VendorName.content:
        vendor = invoice.VendorName.content
    elif invoice.VendorAddressRecipient and invoice.VendorAddressRecipient.content:
        vendor = invoice.VendorAddressRecipient.content

    return SimpleInvoiceData(date=date, total=total, currency=currency, vendor=vendor, filename=filename)


def from_azure_response(azure_result) -> InvoiceData | None:
    """Create InvoiceData from Azure Document Intelligence response.

    This is an alias for _extract_from_azure_response for backward compatibility.
    """
    return _extract_from_azure_response(azure_result)


# Convenience functions for different use cases
async def extract_invoice_simple(path: str) -> SimpleInvoiceData | None:
    """Extract invoice data in simplified format for web API.

    Args:
        path: Path to the invoice file

    Returns:
        SimpleInvoiceData: Simplified format or None if extraction fails
    """
    full_data = await extract_invoice(path)
    if full_data:
        filename = Path(path).name
        return to_simple_format(full_data, filename)
    return None


# Synchronous wrapper for backward compatibility
def extract_invoice_sync(path: str) -> InvoiceData | None:
    """Synchronous wrapper for invoice extraction."""
    import asyncio

    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

    return loop.run_until_complete(extract_invoice(path))
