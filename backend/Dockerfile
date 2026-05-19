FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1
WORKDIR /app

# Install system dependencies needed to build binary Python packages (Pillow, etc.)
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       build-essential \
       gcc \
       libjpeg-dev \
       zlib1g-dev \
       libpng-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python deps first to leverage Docker cache
COPY backend/requirements.txt /app/requirements.txt
RUN pip install --upgrade pip setuptools wheel \
    && pip install --no-cache-dir -r /app/requirements.txt

# Copy app sources
COPY backend /app

EXPOSE 8000
ENV PORT=8000

# Use Render's PORT env when available, fallback to 8000
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
