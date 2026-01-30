# growth_calc-threetiers

# Growth Calculator - Manual Docker Commands

# Building Docker images 
## Step 1: Create api-gateway-python docker images
```bash
cd api-gateway-python
sudo docker build -t api-gateway-python:v1 .
cd ..
```

## Step 2: Create growth-calculator-web:latest
```bash
cd web-frontend
sudo docker build -t growth-calculator-web:latest .
cd ..
```

# Running Container
## Step 1: Create Network
```bash
sudo docker network create growth-calculator-network
```

## Step 2: Start MongoDB
```bash
sudo docker run -d \
  --name growth-calculator-mongodb \
  --network growth-calculator-network \
  -p 27017:27017 \
  -e TZ=Asia/Yangon \
  -v "$(pwd)/mongodb/data":/data/db \
  --health-cmd="mongosh --eval 'db.adminCommand({ping: 1})' --quiet" \
  --health-interval=3s \
  --health-timeout=5s \
  --health-retries=3 \
  --health-start-period=10s \
  mongo:7.0
```

## Step 3: Start API Gateway
```bash
sudo docker run -d \
  --name growth-calculator-api \
  --network growth-calculator-network \
  -p 8080:8080 \
  -e MONGO_URL=mongodb://growth-calculator-mongodb:27017/ \
  api-gateway-python:v1
```

## Step 4: Start Frontend
```bash
sudo docker run -d \
  --name growth-calculator-web \
  --network growth-calculator-network \
  -p 3001:80 \
  -e REACT_APP_API_URL=http://localhost:8080 \
  growth-calculator-web:latest
```

## Verify
```bash
# Check all containers are running
sudo docker ps

# Test API
curl http://localhost:8080/health

# Open frontend
# http://localhost:3001
```

## Stop All & Remove all old containers
```bash
sudo docker stop growth-calculator-web growth-calculator-api growth-calculator-mongodb
sudo docker rm growth-calculator-web growth-calculator-api growth-calculator-mongodb
```

## Clean Network
```bash
sudo docker network rm growth-calculator-network
```

## Remove Docker images
```bash
sudo docker rmi growth-calculator-web:latest api-gateway-python:v1
```


## Docker image delivery & Creating Release
```bash
git tag frontend-v1.1.2 && git push origin frontend-v1.1.2
```

```bash
git tag api-v1.1.1 && git push origin api-v1.1.1
```

```bash 
git tag release-v1.0.0 && git push origin release-v1.0.0
```


## Docker Compose (Recommended)

Use Docker Compose to build and run the full 3-tier stack (MongoDB, API, Frontend) with a single command.

### docker-compose.yml (reference)
```yaml
version: "3.9"

services:
  mongodb:
    image: mongo:7.0
    ports:
      - "27017:27017"
    volumes:
      - ./mongodb/data:/data/db
    environment:
      - TZ=Asia/Yangon
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')", "--quiet"]
      interval: 3s
      timeout: 5s
      retries: 3
      start_period: 10s

  growth-calculator-api:
    build:
      context: ./api-gateway-python
    image: api-gateway-python:v1
    ports:
      - "8080:8080"
    environment:
      - TZ=Asia/Yangon
      - MONGO_URL=mongodb://mongodb:27017/
    depends_on:
      mongodb:
        condition: service_healthy

  growth-calculator-api-health:
    image: curlimages/curl:8.5.0
    depends_on:
      - growth-calculator-api
    command: ["sh", "-c", "curl -fsS http://growth-calculator-api:8080/health || exit 1"]
    restart: "no"

  growth-calculator-web:
    build:
      context: ./web-frontend
    image: growth-calculator-web:latest
    ports:
      - "3001:80"
    environment:
      - TZ=Asia/Yangon
    depends_on:
      - growth-calculator-api

```

Notes:
- Frontend calls the API at `http://localhost:8080` (default in the app). We publish the API on host port 8080 so the browser can reach it directly.
- If you want the frontend to call the API via container DNS instead, build the frontend with `REACT_APP_API_URL=http://growth-calculator-api:8080` baked in at build time (requires Dockerfile changes to pass build args; not needed for the default setup above).

### Quick start
```bash
# From repository root
docker compose up -d --build

# Verify services
docker compose ps
curl http://localhost:8080/health

# Open the frontend
# http://localhost:3001
```

### Stop and clean up
```bash
docker compose down
# Remove volumes (MongoDB data) if you want a fresh database
docker compose down -v
```

### Optional: initialize MongoDB with sample data
You can pre-seed the database using the helper script in [mongodb/setup-database.sh](mongodb/setup-database.sh) before or after running the stack.
```bash
bash mongodb/setup-database.sh
```

