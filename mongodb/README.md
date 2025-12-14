# MongoDB Configuration for Growth Calculator

## Collections

### calculations
Stores calculation records with base, exponent, results, and timestamps.

**Schema:**
```json
{
  "_id": ObjectId,
  "base": Double,
  "exponent": Int,
  "status": String (in_progress|completed|failed),
  "started_at": Date,
  "completed_at": Date?,
  "linear_result": Double?,
  "exponential_result": Double?,
  "total_steps": Int?
}
```

**Indexes:**
- `started_at` (descending) - For querying recent calculations
- `status` - For filtering by status

### calculation_events
Stores detailed event logs for each calculation step.

**Schema:**
```json
{
  "_id": ObjectId,
  "calculation_id": String,
  "event_type": String,
  "message": String,
  "timestamp": Date,
  "data": Object?
}
```

**Event Types:**
- `calculation_started` - Calculation begins
- `linear_started` - Linear calculation phase starts
- `linear_step` - Each linear calculation step
- `linear_completed` - Linear calculation completes
- `exponential_started` - Exponential calculation phase starts
- `exponential_step` - Each exponential calculation step
- `exponential_completed` - Exponential calculation completes
- `calculation_completed` - Entire calculation completes
- `calculation_error` - Error occurred

**Indexes:**
- `calculation_id` - For querying events by calculation
- `timestamp` (descending) - For chronological queries
- `event_type` - For filtering by event type

## Query Examples

### Get recent calculations
```javascript
db.calculations.find().sort({started_at: -1}).limit(10)
```

### Get events for a specific calculation
```javascript
db.calculation_events.find({calculation_id: "..."}).sort({timestamp: 1})
```

### Get all error events
```javascript
db.calculation_events.find({event_type: "calculation_error"})
```

### Count calculations by status
```javascript
db.calculations.aggregate([
  {$group: {_id: "$status", count: {$sum: 1}}}
])
```
