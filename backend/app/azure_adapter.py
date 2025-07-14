"""Azure Document Intelligence adapter for invoice extraction."""

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

from azure.ai.documentintelligence.aio import DocumentIntelligenceClient
from azure.core.credentials import AzureKeyCredential
from dotenv import load_dotenv

load_dotenv()


@dataclass
class InvoiceData:
    """Simplified invoice data structure."""
    
    date: Optional[str] = None
    total: Optional[float] = None
    currency: Optional[str] = None
    vendor: Optional[str] = None
    filename: Optional[str] = None


async def extract_invoice(path: str) -> Optional[InvoiceData]:
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
        async with DocumentIntelligenceClient(
            endpoint=endpoint, 
            credential=AzureKeyCredential(api_key)
        ) as client:
            
            # Read file
            with open(path, "rb") as file:
                file_data = file.read()

            print(f"Processing {path} with Azure Document Intelligence...")

            # Analyze document using prebuilt invoice model
            poller = await client.begin_analyze_document(
                "prebuilt-invoice", 
                file_data, 
                content_type="application/pdf"
            )
            
            result = await poller.result()

            # Extract data from Azure response
            invoice_data = _extract_from_azure_response(result, file_path.name)
            
            return invoice_data

    except Exception as e:
        print(f"Error processing document: {e}")
        return None


def _extract_from_azure_response(azure_result, filename: str) -> Optional[InvoiceData]:
    """Extract simplified data from Azure Document Intelligence response."""
    if not azure_result.documents:
        return None

    invoice = azure_result.documents[0]
    fields = invoice.fields

    # Extract and simplify fields
    invoice_data = InvoiceData(filename=filename)
    
    # Extract date
    if "InvoiceDate" in fields and fields["InvoiceDate"]:
        date_field = fields["InvoiceDate"]
        invoice_data.date = getattr(date_field, 'content', None)
    
    # Extract total and currency
    if "InvoiceTotal" in fields and fields["InvoiceTotal"]:
        total_field = fields["InvoiceTotal"]
        if hasattr(total_field, 'value_currency') and total_field.value_currency:
            invoice_data.total = getattr(total_field.value_currency, 'amount', None)
            invoice_data.currency = getattr(total_field.value_currency, 'currency_code', None)
        elif hasattr(total_field, 'content'):
            # Fallback to content if value_currency is not available
            content = getattr(total_field, 'content', None)
            if content:
                # Try to extract numeric value from content
                try:
                    # Simple extraction - this could be enhanced
                    import re
                    match = re.search(r'[\d,]+\.?\d*', str(content))
                    if match:
                        invoice_data.total = float(match.group().replace(',', ''))
                except (ValueError, AttributeError):
                    pass
    
    # Extract vendor (try VendorName first, then VendorAddressRecipient)
    if "VendorName" in fields and fields["VendorName"]:
        vendor_field = fields["VendorName"]
        invoice_data.vendor = getattr(vendor_field, 'content', None)
    elif "VendorAddressRecipient" in fields and fields["VendorAddressRecipient"]:
        address_field = fields["VendorAddressRecipient"]
        invoice_data.vendor = getattr(address_field, 'content', None)

    return invoice_data


# Synchronous wrapper for backward compatibility
def extract_invoice_sync(path: str) -> Optional[InvoiceData]:
    """Synchronous wrapper for invoice extraction."""
    import asyncio
    
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    
    return loop.run_until_complete(extract_invoice(path))