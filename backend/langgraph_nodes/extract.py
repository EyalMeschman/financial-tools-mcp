"""Extract node for invoice data extraction."""

from app.azure_adapter import extract_invoice


async def run(input: dict) -> dict:
    """Extract node that extracts data from invoices using Azure Document Intelligence.

    Args:
        input: Input dictionary containing pipeline state with 'files' list

    Returns:
        dict: Input dictionary with extracted invoice data
    """
    files = input.get("files", [])
    invoices = []
    
    for file_info in files:
        if "file_path" in file_info:
            file_path = file_info["file_path"]
            filename = file_info["filename"]
            
            try:
                # Extract invoice data using Azure adapter
                invoice_data = await extract_invoice(file_path)
                
                if invoice_data:
                    # Add filename to invoice data for reference
                    invoice_data._filename = filename
                    invoices.append(invoice_data)
                    
                    # Update file status
                    file_info["status"] = "extracted"
                else:
                    # Extraction failed
                    file_info["status"] = "failed"
                    file_info["error_message"] = "Failed to extract invoice data"
                    
            except Exception as e:
                # Handle extraction errors
                file_info["status"] = "failed"
                file_info["error_message"] = str(e)
    
    # Update input with extracted invoices
    result = input.copy()
    result["invoices"] = invoices
    
    return result
