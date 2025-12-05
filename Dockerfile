# Use official lightweight Python image
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Work directory
WORKDIR /app

# Copy requirements first (caching optimization)
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the whole project
COPY . .

# Environment variables
ENV PYTHONUNBUFFERED=1
ENV FLASK_ENV=production
ENV DATABASE_PATH=/data/app.db    
# SQLite DB will live in persistent volume

# Expose app port
EXPOSE 8000

# Start command for Gunicorn
CMD gunicorn -b 0.0.0.0:8000 app:app
