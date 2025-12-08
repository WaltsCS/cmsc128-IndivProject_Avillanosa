#   MULTI-ACCOUNT TDL APP
#   PRODUCTION DOCKERFILE

FROM python:3.11-slim

# Disable Python buffering for logs
ENV PYTHONUNBUFFERED=1

# Working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first (leverages Docker layer caching)
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose Flask port
EXPOSE 8000

# Run using gunicorn (production-grade server)
CMD ["gunicorn", "-b", "0.0.0.0:8000", "app:app"]
