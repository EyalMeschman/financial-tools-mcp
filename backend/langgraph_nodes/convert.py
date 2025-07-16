"""Convert node for currency conversion."""

import os
from decimal import ROUND_HALF_UP, Decimal

from app.azure_adapter import InvoiceData
from app.currency import get_rate


async def run(input: dict) -> dict:
    """Convert node that performs currency conversion.

    Args:
        input: Input dictionary containing pipeline state with structure:
            {
                "job_id": "abc123",
                "target_currency": "ILS",  # optional, defaults to ILS
                "files": [
                    {
                        "id": "file-1",
                        "invoice_date": "2025-07-01",
                        "src_currency": "USD",
                        "invoice_total": 145.67
                    }
                ],
                "invoices": [InvoiceData objects]
            }

    Returns:
        dict: Input dictionary with converted_total and exchange_rate added to each file,
              or status="failed" and error message for failed conversions
    """
    # Get target currency from job payload or environment variable or default to ILS
    target_currency = input.get("target_currency") or os.getenv("DEFAULT_TARGET_CURRENCY", "ILS")

    files = input.get("files", [])
    invoices: list[InvoiceData] = input.get("invoices", [])

    # Process files with their corresponding invoices (if available)
    for invoice, file_data in zip(invoices, files, strict=False):
        try:
            # Extract required fields from file data
            invoice_date = file_data.get("invoice_date")
            src_currency: str = file_data.get("src_currency")
            invoice_total: float = file_data.get("invoice_total")

            # Validate required fields
            if not all([invoice_date, src_currency, invoice_total]):
                file_data["status"] = "failed"
                file_data["error"] = "Missing required fields: invoice_date, src_currency, or invoice_total"
                continue

            # Skip conversion if source and target currencies are the same
            if src_currency.upper() == target_currency.upper():
                file_data["exchange_rate"] = 1.0
                file_data["converted_total"] = float(invoice_total)
                continue

            if invoice and invoice.InvoiceDate and invoice.InvoiceDate.value_date:
                rate = await get_rate(
                    invoice.InvoiceDate.value_date.strftime("%Y-%m-%d"), src_currency, target_currency
                )

            # Convert the total amount with ROUND_HALF_UP rounding
            original_amount = Decimal(str(invoice_total))
            converted_amount = (original_amount * rate).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

            # Add conversion results to file data
            file_data["exchange_rate"] = float(rate)
            file_data["converted_total"] = float(converted_amount)

        except Exception as e:
            # Mark individual file as failed but continue processing others
            file_data["status"] = "failed"
            file_data["error"] = f"Currency conversion failed: {str(e)}"

        # Update invoice object with conversion results (if invoice exists)
        if invoice:
            invoice._conversion_status = file_data.get("status", "success")
            invoice._converted_amount = file_data.get("converted_total")
            invoice._exchange_rate = file_data.get("exchange_rate")

    return input
