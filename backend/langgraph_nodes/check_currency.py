"""Check currency node for currency validation."""

from app.azure_adapter import InvoiceData


async def run(input: dict) -> dict:
    """Check currency node that validates currency information.

    Args:
        input: Input dictionary containing pipeline state with 'invoices' list

    Returns:
        dict: Input dictionary with currency validation results
    """
    invoices: list[InvoiceData] = input.get("invoices", [])

    # Prepare data for currency conversion
    files = []

    for invoice in invoices:
        file_data = {"filename": getattr(invoice, "_filename", "unknown"), "status": "ready_for_conversion"}

        # Extract currency information
        if invoice.InvoiceTotal and invoice.InvoiceTotal.value_currency:
            file_data["src_currency"] = invoice.InvoiceTotal.value_currency.currency_code
            file_data["invoice_total"] = invoice.InvoiceTotal.value_currency.amount
        else:
            file_data["src_currency"] = None
            file_data["invoice_total"] = None
            file_data["status"] = "failed"
            file_data["error"] = "No currency information found in invoice"

        # Extract date information
        file_data["invoice_date"] = "2024-01-01"  # Default date if not found TODO: Why do we need a default date?
        if invoice.InvoiceDate:
            file_data["invoice_date"] = invoice.InvoiceDate.value_date.strftime("%d-%m-%Y")

        files.append(file_data)

    # Update input with currency check results
    result = input.copy()
    result["files"] = files

    return result
