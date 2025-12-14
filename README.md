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

