# Base image
FROM python:3.10-slim

# Metadata
LABEL maintainer="geoserver@romdynamics.com"
LABEL app="ENTRYPOINT + CMD Demo"

# Environment variables
ENV APP_HOME=/app \
    FLASK_ENV=production \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Working directory
WORKDIR $APP_HOME

# Install dependencies first (better caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app source
COPY . .

# Document service port
EXPOSE 5000

# Health check
HEALTHCHECK CMD curl --fail http://localhost:5000/ || exit 1

# ENTRYPOINT defines the fixed executable
ENTRYPOINT ["python"]

# CMD provides default arguments
CMD ["app.py"]


# ENTRYPOINT ["ros2", "launch"]
# CMD ["robot.launch.py"]
# CMD can be overridden at runtime
# docker run my-ros2-app robot.launch.py arg1:=value1
# ENTRYPOINT is fixed and not easily overridden
