#!/usr/bin/env python3
"""
Azure Document Intelligence invoice extractor for F0 tier.
Extracts: Date (DD/MM/YYYY), Invoice Suffix (last 4 digits), Price (ILS/USD), Company name.
"""

import os
import re
import subprocess
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional, Union

import requests
from azure.ai.documentintelligence import DocumentIntelligenceClient
from azure.core.credentials import AzureKeyCredential
from dotenv import load_dotenv

load_dotenv()


@dataclass
class InvoiceData:
    """Dataclass for extracted invoice information."""

    date: str
    invoice_suffix: str
    price: str
    currency: str
    company: str

    @classmethod
    def from_azure_response(cls, azure_result) -> Optional["InvoiceData"]:
        """Create InvoiceData from Azure Document Intelligence response."""
        if not azure_result.documents:
            return None

        invoice = azure_result.documents[0]
        fields = invoice.fields

        # Extract date
        invoice_date = fields.get("InvoiceDate")
        date = invoice_date.content if invoice_date and invoice_date.content else "Not found"

        # Extract invoice ID suffix (last 4 digits)
        invoice_id = fields.get("InvoiceId")
        if invoice_id and invoice_id.content:
            digits = re.findall(r"\d", str(invoice_id.content))
            invoice_suffix = "".join(digits[-4:]) if len(digits) >= 4 else "".join(digits)
        else:
            invoice_suffix = "Not found"

        # Extract total amount and currency from valueCurrency structure
        invoice_total = fields.get("InvoiceTotal")
        if invoice_total and hasattr(invoice_total, "value_currency") and invoice_total.value_currency:
            amount = invoice_total.value_currency.amount
            currency_code = invoice_total.value_currency.currency_code or "Unknown"
            price = str(amount)
            currency = currency_code
        else:
            price = "Not found"
            currency = "Unknown"

        # Extract vendor/company name
        vendor_name = fields.get("VendorName")
        vendor_address_recipient = fields.get("VendorAddressRecipient")

        if vendor_name and vendor_name.content:
            company_name = str(vendor_name.content).replace("\n", " ").strip()
            company = company_name
        elif vendor_address_recipient and vendor_address_recipient.content:
            company = str(vendor_address_recipient.content)
        else:
            company = "Not found"

        return cls(date=date, invoice_suffix=invoice_suffix, price=price, currency=currency, company=company)

    def format_price(self) -> str:
        """Format price with currency."""
        return f"{self.price} {self.currency}" if self.price != "Not found" else "Not found"

    def to_dict(self) -> dict:
        """Convert to dictionary for backward compatibility."""
        return {"date": self.date, "invoice_suffix": self.invoice_suffix, "price": self.format_price(), "company": self.company}


def extract_invoice_data_azure(pdf_path: str) -> Optional[InvoiceData]:
    """Extract invoice data using Azure Document Intelligence."""

    # Get credentials from environment
    endpoint = os.getenv("AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT")
    api_key = os.getenv("AZURE_DOCUMENT_INTELLIGENCE_API_KEY")

    if not endpoint or not api_key:
        print("Error: Missing Azure Document Intelligence credentials in .env file")
        print("Required variables:")
        print("- AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT")
        print("- AZURE_DOCUMENT_INTELLIGENCE_API_KEY")
        return None

    try:
        # Initialize client
        client = DocumentIntelligenceClient(endpoint=endpoint, credential=AzureKeyCredential(api_key))

        # Read PDF file
        with open(pdf_path, "rb") as pdf_file:
            pdf_data = pdf_file.read()

        print(f"Processing {pdf_path} with Azure Document Intelligence...")

        # Analyze document using prebuilt invoice model
        poller = client.begin_analyze_document("prebuilt-invoice", pdf_data, content_type="application/pdf")

        result = poller.result()

        # Create InvoiceData from Azure response
        invoice_data = InvoiceData.from_azure_response(result)

        if invoice_data:
            return invoice_data
        else:
            print("No invoice data found in the document")
            return None

    except Exception as e:
        print(f"Error processing document: {e}")
        return None


def check_usage_quota() -> Optional[Dict[str, Union[int, str]]]:
    """Get F0 tier usage information using Azure Management API."""
    resource_id = os.getenv("AZURE_DOCUMENT_INTELLIGENCE_RESOURCE_ID")

    if not resource_id:
        print("Warning: AZURE_DOCUMENT_INTELLIGENCE_RESOURCE_ID not set in .env")
        print("Cannot check usage quota")
        return None

    try:
        # Get access token using Azure CLI
        result = subprocess.run(
            ["az", "account", "get-access-token", "--resource", "https://management.azure.com/", "--query", "accessToken", "-o", "tsv"],
            capture_output=True,
            text=True,
            check=True,
        )
        token = result.stdout.strip()

        # Calculate current month timespan
        now = datetime.now()
        start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        start = start_of_month.strftime("%Y-%m-%dT%H:%M:%SZ")
        finish = now.strftime("%Y-%m-%dT23:59:59Z")

        # Build metrics API URL
        metrics_url = f"https://management.azure.com/{resource_id}/providers/microsoft.insights/metrics"
        params = {
            "metricnames": "ProcessedPages",
            "interval": "FULL",
            "timespan": f"{start}/{finish}",
            "aggregation": "Total",
            "api-version": "2018-01-01",
        }

        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

        # Make API request
        response = requests.get(metrics_url, params=params, headers=headers)
        response.raise_for_status()

        data = response.json()

        # Extract usage information
        if "value" in data and len(data["value"]) > 0:
            metric = data["value"][0]
            if "timeseries" in metric and len(metric["timeseries"]) > 0:
                timeseries = metric["timeseries"][0]
                if "data" in timeseries and len(timeseries["data"]) > 0:
                    total_pages = timeseries["data"][0].get("total", 0)
                    pages_left = 500 - total_pages

                    print("F0 Tier Usage Information:")
                    print(f"- Pages processed this month: {total_pages}")
                    print(f"- Pages remaining: {pages_left}/500")
                    print("- Reset date: Next month (1st)")

                    return {"used": total_pages, "remaining": pages_left, "total_limit": 500}

        print("No usage data found for this month")
        return None

    except subprocess.CalledProcessError:
        print("Error: Azure CLI not logged in or not available")
        print("Please run: az login")
        return None
    except requests.RequestException as e:
        print(f"Error calling Azure Management API: {e}")
        return None
    except Exception as e:
        print(f"Error checking usage quota: {e}")
        return None


def main():
    """Main function for F5 debugging."""
    # Default to payment.pdf in current directory but allow override
    pdf_path = "payment.pdf"

    # Check if file exists
    if not Path(pdf_path).exists():
        print(f"Error: File '{pdf_path}' not found")
        print("Make sure payment.pdf is in the current directory")
        return

    print("Azure Document Intelligence Invoice Extractor")
    print("=" * 50)

    # Check usage quota
    usage_info = check_usage_quota()
    if usage_info and usage_info["remaining"] <= 10:
        print("⚠️  WARNING: Low on free tier quota!")
    print()

    # Extract data
    data = extract_invoice_data_azure(pdf_path)

    if data:
        print("Extracted Invoice Data:")
        print("-" * 30)
        print(f"Date (DD/MM/YYYY): {data.date}")
        print(f"Invoice Suffix (last 4 digits): {data.invoice_suffix}")
        print(f"Price: {data.price}")
        print(f"Company/Vendor name: {data.company}")
    else:
        print("Failed to extract invoice data")


if __name__ == "__main__":
    main()
