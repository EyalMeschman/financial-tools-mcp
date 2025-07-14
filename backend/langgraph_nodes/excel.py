"""Excel node for report generation."""

from io import BytesIO

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

from app.azure_adapter import InvoiceData


def invoice_suffix(invoice: InvoiceData, filename: str) -> str:
    """Generate a suffix for the invoice based on filename.

    Args:
        invoice: Invoice data (unused in current implementation)
        filename: Original filename

    Returns:
        str: Suffix derived from filename (without extension)
    """
    if not filename:
        return ""

    # Remove extension and return base name
    return filename.rsplit(".", 1)[0] if "." in filename else filename


async def run(input: dict) -> dict:
    """Excel node that generates Excel reports from invoice data.

    Args:
        input: Input dictionary containing 'invoices' key with list of InvoiceData objects

    Returns:
        dict: Dictionary with 'xlsx' (BytesIO bytes) and 'row_count' keys
    """
    invoices: list[InvoiceData] = input.get("invoices", [])

    # Create workbook and worksheet
    wb = Workbook()
    ws = wb.active
    ws.title = "Invoice Report"

    # Define headers
    headers = ["Invoice ID", "Date", "Vendor Name", "Vendor Address", "Amount", "Currency", "Total Content", "Filename"]

    # Style headers
    header_font = Font(bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="366092", end_color="366092", fill_type="solid")
    header_alignment = Alignment(horizontal="center", vertical="center")

    # Write headers
    for col, header in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col, value=header)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = header_alignment

    # Write data rows
    row_num = 2
    for invoice in invoices:
        # Extract filename from invoice suffix helper
        filename = invoice_suffix(invoice, getattr(invoice, "_filename", ""))

        # Extract data with error handling
        invoice_id = invoice.InvoiceId.content if invoice.InvoiceId else "ERROR"
        date = invoice.InvoiceDate.content if invoice.InvoiceDate else "ERROR"
        vendor_name = invoice.VendorName.content if invoice.VendorName else "ERROR"
        vendor_address = invoice.VendorAddressRecipient.content if invoice.VendorAddressRecipient else "ERROR"

        # Handle total and currency
        amount = "ERROR"
        currency = "ERROR"
        total_content = "ERROR"

        if invoice.InvoiceTotal:
            total_content = invoice.InvoiceTotal.content or "ERROR"
            if invoice.InvoiceTotal.value_currency:
                amount = invoice.InvoiceTotal.value_currency.amount
                currency = invoice.InvoiceTotal.value_currency.currency_code or "ERROR"

        # Write row data
        row_data = [invoice_id, date, vendor_name, vendor_address, amount, currency, total_content, filename]

        for col, value in enumerate(row_data, 1):
            ws.cell(row=row_num, column=col, value=value)

        row_num += 1

    # Add placeholder ERROR rows if no invoices provided
    if not invoices:
        error_row = ["ERROR"] * len(headers)
        for col, value in enumerate(error_row, 1):
            ws.cell(row=2, column=col, value=value)
        row_num = 3

    # Auto-adjust column widths
    for col in range(1, len(headers) + 1):
        column_letter = get_column_letter(col)
        ws.column_dimensions[column_letter].width = 15

    # Save to BytesIO
    excel_buffer = BytesIO()
    wb.save(excel_buffer)
    excel_buffer.seek(0)

    # Calculate row count (excluding header)
    data_row_count = max(1, len(invoices)) if invoices else 1

    return {"xlsx": excel_buffer.getvalue(), "row_count": data_row_count}
