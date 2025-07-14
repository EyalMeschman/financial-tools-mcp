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
    
    return input