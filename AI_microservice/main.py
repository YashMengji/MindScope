from fastapi import FastAPI, HTTPException  # ✅ Add HTTPException
from pydantic import BaseModel
from typing import List, Optional
import logging
from datetime import datetime
from fastapi.middleware.cors import CORSMiddleware


# uvicorn main:app --reload --host 0.0.0.0 --port 8000



app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this to restrict origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ Initialize logging properly
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ChatText(BaseModel): 
    chatText: str

@app.get("/")
def root():
    return {"Hello FastAPI"}

class ChatSession(BaseModel):
    messages: List[str]
    startTimestamp: float
    endTimestamp: float
    sessionId: str

@app.post("/chat-text-data")
async def receive_chat_data(session: ChatSession):
    try:
        logger.info("=== NEW CHAT SESSION RECEIVED ===")
        logger.info(f"Session ID: {session.sessionId}")
        
        if session.startTimestamp and session.endTimestamp:
            duration_sec = (session.endTimestamp - session.startTimestamp) / 1000
            logger.info(f"Session duration: {duration_sec:.2f} seconds")
        
        # Log each message individually
        if session.messages:
            logger.info(f"Number of messages: {len(session.messages)}")
            for i, message in enumerate(session.messages, 1):
                logger.info(f"Message {i}: '{message}'")
                
            # ✅ Basic toxicity check (example)
            for message in session.messages:
                toxicity_score = analyze_toxicity(message)
                if toxicity_score > 0.7:
                    feedback = generate_feedback(message)
                    logger.info(f"🚨 Toxic message detected! Score: {toxicity_score}")
                    logger.info(f"💡 Suggestion: {feedback}")
        else:
            logger.warning("No messages received in this session")
        
        logger.info("=== END OF SESSION ===")
        
        return {
            "status": "success", 
            "message": f"Processed {len(session.messages)} messages",
            "session_id": session.sessionId
        }
        
    except Exception as e:
        logger.error(f"Error processing chat data: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def analyze_toxicity(message: str) -> float:
    """Basic toxicity detection - replace with your ML model"""
    toxic_words = ["hate", "stupid", "idiot", "never", "always", "worst", "bad", "terrible"]
    message_lower = message.lower()
    
    for word in toxic_words:
        if word in message_lower:
            return 0.9  # High toxicity score
    
    return 0.1  # Low toxicity score

def generate_feedback(toxic_message: str) -> str:
    """Generate constructive feedback"""
    feedback_map = {
        "hate": "Consider expressing dislike more constructively",
        "stupid": "Try focusing on the idea rather than the person",
        "idiot": "Use more respectful language to maintain positive dialogue",
        "never": "Avoid absolute statements that can escalate conflict",
        "always": "Specific examples are more helpful than generalizations"
    }
    
    for word, suggestion in feedback_map.items():
        if word in toxic_message.lower():
            return f"'{toxic_message}' → {suggestion}"
    
    return f"Consider rephrasing more constructively"