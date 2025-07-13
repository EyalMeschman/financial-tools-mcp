"""Base node for LangGraph pipeline."""


async def run(input: dict) -> dict:
    """Base node that passes input through unchanged.
    
    Args:
        input: Input dictionary containing pipeline state
        
    Returns:
        dict: Same input dictionary unchanged
    """
    return input