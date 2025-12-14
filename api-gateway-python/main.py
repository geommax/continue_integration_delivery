from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from pymongo import MongoClient
from datetime import datetime
import math
import asyncio
import json
from typing import List, Optional
import os
from bson import ObjectId

app = FastAPI(title="Growth Pattern API Gateway")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection
MONGO_URL = os.getenv("MONGO_URL", "mongodb://mongodb:27017/")
client = MongoClient(MONGO_URL)
db = client["growth_calculator"]
events_collection = db["calculation_events"]
calculations_collection = db["calculations"]

# Request/Response Models
class CalculationRequest(BaseModel):
    base: float
    exponent: int

class StepLog(BaseModel):
    step: int
    operation: str
    result: float
    timestamp: str

class CalculationResponse(BaseModel):
    calculation_id: str
    base: float
    exponent: int
    linear_result: float
    exponential_result: float
    linear_logs: List[StepLog]
    exponential_logs: List[StepLog]
    total_steps: int
    started_at: str
    completed_at: str

class EventLog(BaseModel):
    event_id: str
    calculation_id: str
    event_type: str
    message: str
    timestamp: str
    data: Optional[dict] = None

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "api-gateway-python",
        "database": "connected" if client.server_info() else "disconnected",
        "timestamp": datetime.utcnow().isoformat()
    }

@app.post("/api/calculate/stream")
async def calculate_growth_stream(request: CalculationRequest):
    """
    Perform linear and exponential growth calculations with real-time streaming.
    Returns Server-Sent Events (SSE) with 1-second delay between each step.
    """
    async def generate_calculation_events():
        try:
            # Validate input
            if request.base <= 0:
                yield f"data: {json.dumps({'type': 'error', 'error': 'Base must be positive'})}\n\n"
                return
            
            if request.exponent <= 0 or request.exponent > 100:
                yield f"data: {json.dumps({'type': 'error', 'error': 'Exponent must be between 1 and 100'})}\n\n"
                return
            
            # Create calculation record
            started_at = datetime.utcnow()
            calculation_doc = {
                "base": request.base,
                "exponent": request.exponent,
                "status": "in_progress",
                "started_at": started_at,
                "completed_at": None
            }
            calc_result = calculations_collection.insert_one(calculation_doc)
            calculation_id = str(calc_result.inserted_id)
            
            # Send start event
            start_event = json.dumps({
                'type': 'start',
                'calculation_id': calculation_id,
                'base': request.base,
                'exponent': request.exponent
            })
            yield f"data: {start_event}\n\n"
            
            log_event(calculation_id, "calculation_started", 
                     f"Starting calculation: base={request.base}, exponent={request.exponent}",
                     {"base": request.base, "exponent": request.exponent})
            
            # Small delay to ensure start event is sent
            await asyncio.sleep(0.1)
            
            # Perform calculations step by step with 1-second delay
            for i in range(1, request.exponent + 1):
                # Linear calculation
                linear_result = request.base * i
                
                # Exponential calculation
                exponential_result = math.pow(request.base, i)
                
                # Send step event
                step_data = {
                    'type': 'step',
                    'step': i,
                    'linear': {
                        'operation': f"{request.base} × {i}",
                        'result': linear_result
                    },
                    'exponential': {
                        'operation': f"{request.base}^{i}",
                        'result': exponential_result
                    },
                    'timestamp': datetime.utcnow().isoformat()
                }
                
                yield f"data: {json.dumps(step_data)}\n\n"
                
                # Log to database (async to not block streaming)
                try:
                    log_event(calculation_id, "linear_step", 
                             f"Step {i}: {request.base} × {i} = {linear_result}",
                             {"step": i, "result": linear_result, "type": "linear"})
                    
                    log_event(calculation_id, "exponential_step",
                             f"Step {i}: {request.base}^{i} = {exponential_result}",
                             {"step": i, "result": exponential_result, "type": "exponential"})
                except Exception as e:
                    print(f"Warning: Failed to log event: {e}")
                
                # Wait 1 second before next step (like C++ app)
                await asyncio.sleep(1)
            
            # Final results
            linear_final = request.base * request.exponent
            exponential_final = math.pow(request.base, request.exponent)
            
            # Update calculation record
            completed_at = datetime.utcnow()
            try:
                calculations_collection.update_one(
                    {"_id": ObjectId(calculation_id)},
                    {
                        "$set": {
                            "status": "completed",
                            "completed_at": completed_at,
                            "linear_result": linear_final,
                            "exponential_result": exponential_final,
                            "total_steps": request.exponent
                        }
                    }
                )
                
                log_event(calculation_id, "calculation_completed",
                         "Calculation completed successfully")
            except Exception as e:
                print(f"Warning: Failed to update calculation: {e}")
            
            # Send completion event
            completion_data = {
                'type': 'complete',
                'calculation_id': calculation_id,
                'linear_result': linear_final,
                'exponential_result': exponential_final,
                'total_steps': request.exponent,
                'started_at': started_at.isoformat(),
                'completed_at': completed_at.isoformat()
            }
            
            yield f"data: {json.dumps(completion_data)}\n\n"
            
        except Exception as e:
            error_data = {'type': 'error', 'message': str(e)}
            yield f"data: {json.dumps(error_data)}\n\n"
            if 'calculation_id' in locals():
                try:
                    log_event(calculation_id, "calculation_error", f"Error: {str(e)}", {"error": str(e)})
                except:
                    pass
    
    return StreamingResponse(
        generate_calculation_events(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "Content-Type": "text/event-stream; charset=utf-8"
        }
    )

@app.post("/api/calculate", response_model=CalculationResponse)
async def calculate_growth(request: CalculationRequest):
    """
    Perform linear and exponential growth calculations (instant, no streaming).
    Linear: B × 1, B × 2, ..., B × E
    Exponential: B^1, B^2, ..., B^E
    """
    try:
        # Validate input
        if request.base <= 0:
            raise HTTPException(status_code=400, detail="Base must be positive")
        
        if request.exponent <= 0 or request.exponent > 100:
            raise HTTPException(status_code=400, detail="Exponent must be between 1 and 100")
        
        # Create calculation record
        started_at = datetime.utcnow()
        calculation_doc = {
            "base": request.base,
            "exponent": request.exponent,
            "status": "in_progress",
            "started_at": started_at,
            "completed_at": None
        }
        calc_result = calculations_collection.insert_one(calculation_doc)
        calculation_id = str(calc_result.inserted_id)
        
        log_event(calculation_id, "calculation_started", 
                 f"Starting calculation: base={request.base}, exponent={request.exponent}",
                 {"base": request.base, "exponent": request.exponent})
        
        linear_logs = []
        exponential_logs = []
        
        # Perform calculations
        for i in range(1, request.exponent + 1):
            # Linear
            linear_result = request.base * i
            linear_logs.append(StepLog(
                step=i,
                operation=f"{request.base} × {i}",
                result=linear_result,
                timestamp=datetime.utcnow().isoformat()
            ))
            
            # Exponential
            exponential_result = math.pow(request.base, i)
            exponential_logs.append(StepLog(
                step=i,
                operation=f"{request.base}^{i}",
                result=exponential_result,
                timestamp=datetime.utcnow().isoformat()
            ))
        
        linear_final = request.base * request.exponent
        exponential_final = math.pow(request.base, request.exponent)
        
        # Update calculation record
        completed_at = datetime.utcnow()
        calculations_collection.update_one(
            {"_id": ObjectId(calculation_id)},
            {
                "$set": {
                    "status": "completed",
                    "completed_at": completed_at,
                    "linear_result": linear_final,
                    "exponential_result": exponential_final,
                    "total_steps": request.exponent
                }
            }
        )
        
        log_event(calculation_id, "calculation_completed", "Calculation completed successfully")
        
        return CalculationResponse(
            calculation_id=calculation_id,
            base=request.base,
            exponent=request.exponent,
            linear_result=linear_final,
            exponential_result=exponential_final,
            linear_logs=linear_logs,
            exponential_logs=exponential_logs,
            total_steps=request.exponent,
            started_at=started_at.isoformat(),
            completed_at=completed_at.isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        log_event(calculation_id if 'calculation_id' in locals() else "unknown",
                 "calculation_error", f"Error: {str(e)}", {"error": str(e)})
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/calculations")
async def get_calculations(limit: int = 10):
    """Get recent calculations"""
    calculations = list(calculations_collection.find().sort("started_at", -1).limit(limit))
    
    for calc in calculations:
        calc["_id"] = str(calc["_id"])
        if calc.get("started_at"):
            calc["started_at"] = calc["started_at"].isoformat()
        if calc.get("completed_at"):
            calc["completed_at"] = calc["completed_at"].isoformat()
    
    return {"calculations": calculations}

@app.get("/api/events/{calculation_id}")
async def get_calculation_events(calculation_id: str):
    """Get all events for a specific calculation"""
    events = list(events_collection.find({"calculation_id": calculation_id}).sort("timestamp", 1))
    
    for event in events:
        event["_id"] = str(event["_id"])
        if event.get("timestamp"):
            event["timestamp"] = event["timestamp"].isoformat()
    
    return {"events": events, "count": len(events)}

@app.get("/api/events")
async def get_all_events(limit: int = 50):
    """Get recent events"""
    events = list(events_collection.find().sort("timestamp", -1).limit(limit))
    
    for event in events:
        event["_id"] = str(event["_id"])
        if event.get("timestamp"):
            event["timestamp"] = event["timestamp"].isoformat()
    
    return {"events": events, "count": len(events)}

def log_event(calculation_id: str, event_type: str, message: str, data: dict = None):
    """Log an event to MongoDB"""
    event_doc = {
        "calculation_id": calculation_id,
        "event_type": event_type,
        "message": message,
        "timestamp": datetime.utcnow(),
        "data": data or {}
    }
    events_collection.insert_one(event_doc)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
