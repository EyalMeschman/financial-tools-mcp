"""Convert node for currency conversion."""

import os
from decimal import ROUND_HALF_UP, Decimal

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
                ]
            }

    Returns:
        dict: Input dictionary with converted_total and exchange_rate added to each file,
              or status="failed" and error message for failed conversions
    """
    # Get target currency from job payload or environment variable or default to ILS
    target_currency = input.get("target_currency") or os.getenv("DEFAULT_TARGET_CURRENCY", "ILS")

    files = input.get("files", [])
    invoices = input.get("invoices", [])

    for file_data in files:
        try:
            # Extract required fields
            invoice_date = file_data.get("invoice_date")
            src_currency = file_data.get("src_currency")
            invoice_total = file_data.get("invoice_total")

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

            # Get exchange rate from Frankfurter API
            rate = await get_rate(invoice_date, src_currency, target_currency)

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

    # Also apply conversion results to invoices if they exist
    if invoices:
        conversion_data = {}
        for file_data in files:
            filename = file_data.get("filename")
            if filename:
                conversion_data[filename] = {
                    "converted_total": file_data.get("converted_total"),
                    "exchange_rate": file_data.get("exchange_rate"),
                    "status": file_data.get("status", "success")
                }
        
        # Apply conversion results to invoices
        for invoice in invoices:
            filename = getattr(invoice, "_filename", "unknown")
            if filename in conversion_data:
                conv_data = conversion_data[filename]
                invoice._converted_amount = conv_data["converted_total"]
                invoice._exchange_rate = conv_data["exchange_rate"]
                invoice._conversion_status = conv_data["status"]

    return input
