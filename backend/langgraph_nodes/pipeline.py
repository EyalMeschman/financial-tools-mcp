"""LangGraph pipeline for invoice processing workflow."""

from langgraph.graph import Graph

from . import upload, extract, check_currency, convert, excel


def create_pipeline() -> Graph:
    """Create the invoice processing pipeline graph.
    
    Returns:
        Graph: LangGraph instance with nodes linked in processing order
    """
    # Create a new graph
    graph = Graph()
    
    # Add nodes to the graph
    graph.add_node("upload", upload.run)
    graph.add_node("extract", extract.run)
    graph.add_node("check_currency", check_currency.run)
    graph.add_node("convert", convert.run)
    graph.add_node("excel", excel.run)
    
    # Link nodes in the processing order
    graph.add_edge("upload", "extract")
    graph.add_edge("extract", "check_currency")
    graph.add_edge("check_currency", "convert")
    graph.add_edge("convert", "excel")
    
    # Set entry point
    graph.set_entry_point("upload")
    graph.set_finish_point("excel")
    
    return graph


def get_compiled_pipeline():
    """Get a compiled pipeline ready for execution.
    
    Returns:
        Compiled LangGraph pipeline
    """
    pipeline = create_pipeline()
    return pipeline.compile()