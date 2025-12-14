FROM python:3.11-slim

WORKDIR /app

# Set timezone to Myanmar (Asia/Yangon)
ENV TZ=Asia/Yangon
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY main.py .

# Expose port
EXPOSE 8080

# Health check - verify both API is running AND MongoDB is accessible
HEALTHCHECK --interval=1s --timeout=2s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; response = urllib.request.urlopen('http://localhost:8080/health'); import json; data = json.loads(response.read()); exit(0 if data.get('database') == 'connected' else 1)" || exit 1

# Run the application with log level and disable buffering
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080", "--log-level", "info", "--timeout-keep-alive", "300"]
