from backend.rag.vectordb import get_vector_db

def retrieve_context(query: str, source_type: str = None, k: int = 4):
    """Retrieves relevant chunks from ChromaDB based on similarity search.
    
    If source_type is specified (e.g. 'fia_rules' or 'race_reports'), 
    it filters results accordingly.
    """
    db = get_vector_db()
    if db is None:
        return []
        
    search_kwargs = {}
    if source_type:
        search_kwargs["filter"] = {"source_type": source_type}
        
    # Perform similarity search
    results = db.similarity_search(query, k=k, **search_kwargs)
    return results

def get_fia_rule_context(query: str, k: int = 3) -> str:
    """Retrieves and formats relevant FIA rules context."""
    results = retrieve_context(query, source_type="fia_rules", k=k)
    context_parts = []
    for doc in results:
        context_parts.append(
            f"[{doc.metadata.get('rule_id', 'Rule')}] {doc.metadata.get('title', 'Regulation')}:\n"
            f"{doc.page_content}"
        )
    return "\n\n---\n\n".join(context_parts)

def get_race_report_context(query: str, k: int = 2) -> str:
    """Retrieves and formats relevant race reports context."""
    results = retrieve_context(query, source_type="race_reports", k=k)
    context_parts = []
    for doc in results:
        context_parts.append(
            f"Race Report - {doc.metadata.get('race_name', 'Grand Prix')}:\n"
            f"{doc.page_content}"
        )
    return "\n\n---\n\n".join(context_parts)
