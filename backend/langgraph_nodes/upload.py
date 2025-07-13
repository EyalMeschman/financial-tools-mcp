"""Upload node for file processing."""


async def run(input: dict) -> dict:
    """Upload node that processes file uploads.
    
    Args:
        input: Input dictionary containing pipeline state
        
    Returns:
        dict: Same input dictionary unchanged
    """
    return input