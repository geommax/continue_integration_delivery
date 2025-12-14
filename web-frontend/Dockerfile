# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the app
RUN npm run build

# Production stage
FROM nginx:alpine

# Set timezone to Myanmar (Asia/Yangon)
ENV TZ=Asia/Yangon
RUN apk add --no-cache tzdata && \
    ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && \
    echo $TZ > /etc/timezone

# Copy built static files from builder
COPY --from=builder /app/build /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Health check - verify nginx is serving AND API is reachable
HEALTHCHECK --interval=3s --timeout=2s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:80/ && \
      wget --quiet --tries=1 --spider --timeout=2 http://growth-calculator-api:8080/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
