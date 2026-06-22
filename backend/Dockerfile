FROM python:3.10-slim

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first (for layer caching)
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r ./backend/requirements.txt

# Copy all backend code
COPY backend/ /app/backend/

# Set python path so that backend imports work
ENV PYTHONPATH=/app

# Generate datasets, train ML models, build RAG collections
RUN python -m backend.generate_data
RUN python -m backend.train_ml
RUN python -c "from backend.rag.vectordb import build_vector_db; build_vector_db()"

EXPOSE 8000

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
