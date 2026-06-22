FROM python:3.10-slim

WORKDIR /app

# Install build dependencies for libraries like scikit-learn/xgboost if needed
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all backend code under the /app/backend directory
COPY . /app/backend

# Set python path so that backend imports work perfectly
ENV PYTHONPATH=/app

# Generate the datasets, train ML models, and build RAG collections
RUN python -m backend.generate_data
RUN python -m backend.train_ml
RUN python -c "from backend.rag.vectordb import build_vector_db; build_vector_db()"

EXPOSE 8000

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
