import os
from backend.rag.loader import load_fia_rules, load_race_reports
from backend.rag.chunker import chunk_documents
from backend.rag.embeddings import get_embeddings_model

try:
    from langchain_community.vectorstores import Chroma
except ImportError:
    try:
        from langchain_chroma import Chroma
    except ImportError:
        Chroma = None

DB_PATH = "backend/chroma_db"

def build_vector_db():
    """Builds and populates the ChromaDB vector store from raw JSON documents."""
    if Chroma is None:
        print("Error: Chroma vectorstore library is not installed.")
        return False
        
    print("Building Vector Database...")
    embeddings = get_embeddings_model()
    
    # Load and chunk FIA Rules
    fia_docs = load_fia_rules()
    fia_chunks = chunk_documents(fia_docs)
    
    # Load and chunk Race Reports
    report_docs = load_race_reports()
    report_chunks = chunk_documents(report_docs)
    
    # Combine chunks
    all_chunks = fia_chunks + report_chunks
    
    # Initialize Chroma and persist chunks
    print(f"Indexing {len(all_chunks)} chunks to ChromaDB at '{DB_PATH}'...")
    db = Chroma.from_documents(
        documents=all_chunks,
        embedding=embeddings,
        persist_directory=DB_PATH
    )
    print("Vector database build complete!")
    return True

def get_vector_db():
    """Returns the loaded Chroma vector store instance."""
    if Chroma is None:
        print("Error: Chroma vectorstore library is not installed.")
        return None
    embeddings = get_embeddings_model()
    if not os.path.exists(DB_PATH):
        print(f"Vector DB directory '{DB_PATH}' does not exist. Building it now.")
        build_vector_db()
        
    return Chroma(
        persist_directory=DB_PATH,
        embedding_function=embeddings
    )

if __name__ == "__main__":
    build_vector_db()
