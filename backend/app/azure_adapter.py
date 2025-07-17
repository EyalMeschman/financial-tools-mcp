"""Azure Document Intelligence adapter for invoice extraction."""

import os
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

from azure.ai.documentintelligence.aio import DocumentIntelligenceClient
from azure.core.credentials import AzureKeyCredential
from dotenv import load_dotenv

load_dotenv()

# Confidence threshold for accepting extracted data
CONFIDENCE_THRESHOLD = 0.4
LOW_CONFIDENCE_PLACEHOLDER = "CONFIDENCE_TOO_LOW"


# Robust internal dataclasses (preserving original structure)
@dataclass
class DefaultContent:
    """Text content with optional confidence."""

    content: str
    confidence: float


@dataclass
class InvoiceDate:
    """Invoice date with optional confidence."""

    value_date: datetime | None
    confidence: float


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
    confidence: float


@dataclass
class InvoiceData:
    """Complete invoice data structure matching Azure response."""

    InvoiceDate: InvoiceDate | None
    InvoiceId: DefaultContent | None
    InvoiceTotal: InvoiceTotal | None
    VendorName: DefaultContent | None
    VendorAddressRecipient: DefaultContent | None


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
            # poller = await client.begin_analyze_document("prebuilt-receipt", file_data, content_type="application/pdf")

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

    invoice_date = None
    if "InvoiceDate" in fields and fields["InvoiceDate"]:
        value_date = getattr(fields["InvoiceDate"], "value_date", None)
        confidence = getattr(fields["InvoiceDate"], "confidence", 0.0)
        if value_date:
            invoice_date = InvoiceDate(value_date=value_date, confidence=confidence)
            if confidence > CONFIDENCE_THRESHOLD:
                invoice_date = InvoiceDate(value_date=value_date, confidence=confidence)

    invoice_id = None
    if "InvoiceId" in fields and fields["InvoiceId"]:
        content = getattr(fields["InvoiceId"], "content", "")
        confidence = getattr(fields["InvoiceId"], "confidence", 0.0)
        if content:
            invoice_id = DefaultContent(content=LOW_CONFIDENCE_PLACEHOLDER, confidence=confidence)
            if confidence > CONFIDENCE_THRESHOLD:
                invoice_id = DefaultContent(content=content, confidence=confidence)

    invoice_total = None
    if "InvoiceTotal" in fields and fields["InvoiceTotal"]:
        total_field: InvoiceTotal = fields["InvoiceTotal"]
        content = getattr(total_field, "content", "")
        confidence = getattr(total_field, "confidence", 0.0)
        if content or (hasattr(total_field, "value_currency") and total_field.value_currency):
            value_currency = ValueCurrency(amount=0.0, currency_code=LOW_CONFIDENCE_PLACEHOLDER)
            invoice_total = InvoiceTotal(
                value_currency=value_currency, content=LOW_CONFIDENCE_PLACEHOLDER, confidence=confidence
            )
            if confidence > CONFIDENCE_THRESHOLD:
                value_currency = None
                if hasattr(total_field, "value_currency") and total_field.value_currency:
                    amount = getattr(total_field.value_currency, "amount", 0.0)
                    currency_code = getattr(total_field.value_currency, "currency_code", "")
                    if amount or currency_code:
                        value_currency = ValueCurrency(amount=amount, currency_code=currency_code)
                invoice_total = InvoiceTotal(value_currency=value_currency, content=content, confidence=confidence)

    vendor_name = None
    if "VendorName" in fields and fields["VendorName"]:
        content = getattr(fields["VendorName"], "content", "")
        confidence = getattr(fields["VendorName"], "confidence", 0.0)
        if content:
            vendor_name = DefaultContent(content=LOW_CONFIDENCE_PLACEHOLDER, confidence=confidence)
            if confidence > CONFIDENCE_THRESHOLD:
                vendor_name = DefaultContent(content=content, confidence=confidence)

    vendor_address = None
    if not vendor_name and "VendorAddressRecipient" in fields and fields["VendorAddressRecipient"]:
        content = getattr(fields["VendorAddressRecipient"], "content", "")
        confidence = getattr(fields["VendorAddressRecipient"], "confidence", 0.0)
        if content:
            vendor_address = DefaultContent(content=LOW_CONFIDENCE_PLACEHOLDER, confidence=confidence)
            if confidence > CONFIDENCE_THRESHOLD:
                vendor_address = DefaultContent(content=content, confidence=confidence)

    return InvoiceData(
        InvoiceDate=invoice_date,
        InvoiceId=invoice_id,
        InvoiceTotal=invoice_total,
        VendorName=vendor_name,
        VendorAddressRecipient=vendor_address,
    )
