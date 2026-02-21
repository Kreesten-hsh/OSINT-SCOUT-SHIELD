# Use official Playwright image
FROM mcr.microsoft.com/playwright/python:v1.58.0-jammy

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Download spaCy french model
RUN python -m spacy download fr_core_news_sm

# Copy source code
COPY . .

# Default worker command
CMD ["python", "workers/worker.py"]
