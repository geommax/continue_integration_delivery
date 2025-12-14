#!/bin/bash
# Initialize MongoDB with pre-configured data

echo "🗄️  Setting up MongoDB database..."

# Get script directory and navigate to project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

echo "📂 Working directory: $PROJECT_ROOT"

# Create data directory
mkdir -p mongodb/data

# Start temporary MongoDB container
echo "📦 Starting temporary MongoDB container..."
CONTAINER_ID=$(sudo docker run -d \
  --name temp-mongodb-init \
  -v "$PROJECT_ROOT/mongodb/data":/data/db \
  -p 27017:27017 \
  mongo:7.0)

if [ $? -ne 0 ]; then
  echo "❌ Failed to start MongoDB container"
  exit 1
fi

echo "Container ID: $CONTAINER_ID"

# Wait for MongoDB to be ready
echo "⏳ Waiting for MongoDB to start..."
for i in {1..30}; do
  if sudo docker exec temp-mongodb-init mongosh --eval "db.adminCommand('ping')" &>/dev/null; then
    echo "✅ MongoDB is ready!"
    break
  fi
  if [ $i -eq 30 ]; then
    echo "❌ MongoDB failed to start within 30 seconds"
    echo "📋 Container logs:"
    sudo docker logs temp-mongodb-init
    sudo docker rm -f temp-mongodb-init
    exit 1
  fi
  sleep 1
done

# Initialize database
echo "📝 Initializing database with schema and sample data..."
sudo docker exec -i temp-mongodb-init mongosh growth_calculator <<'EOF'

// Create calculations collection with flexible numeric types
db.createCollection("calculations", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["base", "exponent", "status", "started_at"],
      properties: {
        base: { bsonType: ["double", "int"] },
        exponent: { bsonType: "int" },
        status: { enum: ["in_progress", "completed", "failed"] },
        started_at: { bsonType: "date" },
        completed_at: { bsonType: ["date", "null"] },
        linear_result: { bsonType: ["double", "int", "null"] },
        exponential_result: { bsonType: ["double", "int", "long", "null"] },
        total_steps: { bsonType: ["int", "null"] }
      }
    }
  }
});

db.createCollection("calculation_events", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["calculation_id", "event_type", "message", "timestamp"],
      properties: {
        calculation_id: { bsonType: "string" },
        event_type: { 
          enum: [
            "calculation_started", "calculation_completed", "calculation_error",
            "linear_started", "linear_step", "linear_completed",
            "exponential_started", "exponential_step", "exponential_completed"
          ] 
        },
        message: { bsonType: "string" },
        timestamp: { bsonType: "date" },
        data: { bsonType: ["object", "null"] }
      }
    }
  }
});

db.calculations.createIndex({ "started_at": -1 });
db.calculations.createIndex({ "status": 1 });
db.calculation_events.createIndex({ "calculation_id": 1 });
db.calculation_events.createIndex({ "timestamp": -1 });
db.calculation_events.createIndex({ "event_type": 1 });

db.calculations.insertMany([
  {
    base: 2.0,
    exponent: NumberInt(10),
    status: "completed",
    started_at: new Date(),
    completed_at: new Date(),
    linear_result: 20.0,
    exponential_result: 1024.0,
    total_steps: NumberInt(10)
  },
  {
    base: 3.0,
    exponent: NumberInt(5),
    status: "completed",
    started_at: new Date(),
    completed_at: new Date(),
    linear_result: 15.0,
    exponential_result: 243.0,
    total_steps: NumberInt(5)
  }
]);

print("✅ Database initialized successfully!");
print("📊 Collections created: calculations, calculation_events");
print("📈 Sample calculations inserted: " + db.calculations.countDocuments());
print("🔍 Indexes created for performance");
EOF

# Stop and remove temporary container
echo "🧹 Cleaning up temporary container..."
sudo docker stop temp-mongodb-init
sudo docker rm temp-mongodb-init

echo ""
echo "✅ MongoDB database setup complete!"
echo "📁 Database files location: $PROJECT_ROOT/mongodb/data/"
echo "📝 Total database files created: $(ls -1 "$PROJECT_ROOT/mongodb/data/" 2>/dev/null | wc -l)"
echo ""
echo "🚀 Next steps:"
echo "  1. Run MongoDB container:"
echo "     sudo docker run -d --name growth-calculator-mongodb -p 27017:27017 -v \"$PROJECT_ROOT/mongodb/data\":/data/db mongo:7.0"
echo ""
echo "  2. Verify database:"
echo "     sudo docker exec -it growth-calculator-mongodb mongosh --eval \"use growth_calculator; db.calculations.find().pretty()\"" 
