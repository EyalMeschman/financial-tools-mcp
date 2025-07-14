"""Upload node for file processing."""

import os
from pathlib import Path


async def run(input: dict) -> dict:
    """Upload node that processes file uploads.

    Args:
        input: Input dictionary containing pipeline state with 'files' list

    Returns:
        dict: Input dictionary with processed file paths
    """
    # Ensure uploads directory exists
    uploads_dir = Path("uploads")
    uploads_dir.mkdir(exist_ok=True)
    
    # Process files if they exist
    files = input.get("files", [])
    processed_files = []
    
    for file_info in files:
        # If file_info has file data, save it to uploads directory
        if "file_data" in file_info:
            filename = file_info["filename"]
            file_data = file_info["file_data"]
            
            # Save file to uploads directory
            file_path = uploads_dir / filename
            with open(file_path, "wb") as f:
                f.write(file_data)
            
            processed_files.append({
                "filename": filename,
                "file_path": str(file_path),
                "status": "uploaded"
            })
        else:
            # File info without data, just pass through
            processed_files.append(file_info)
    
    # Update input with processed files
    result = input.copy()
    result["files"] = processed_files
    
    return result
