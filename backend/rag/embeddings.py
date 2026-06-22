try:
    from langchain_huggingface import HuggingFaceEmbeddings
except ImportError:
    try:
        from langchain_community.embeddings import HuggingFaceEmbeddings
    except ImportError:
        from langchain_core.embeddings import Embeddings
        # Fallback dummy class if dependencies aren't loaded during testing
        class HuggingFaceEmbeddings(Embeddings):
            def __init__(self, model_name): pass
            def embed_documents(self, texts): return [[0.0]*384 for _ in texts]
            def embed_query(self, text): return [0.0]*384

def get_embeddings_model():
    """Initializes and returns the HuggingFace embeddings model."""
    try:
        return HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2",
            model_kwargs={"device": "cpu"}
        )
    except Exception as e:
        print(f"Error loading HuggingFaceEmbeddings: {e}. Returning mock embeddings.")
        return HuggingFaceEmbeddings("mock")
