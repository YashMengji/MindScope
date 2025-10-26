from fastapi import FastAPI, HTTPException  # ✅ Add HTTPException
from pydantic import BaseModel
from typing import List, Optional
import logging
from datetime import datetime
from fastapi.middleware.cors import CORSMiddleware
from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification

import torch
import torch.nn as nn
import torch.nn.functional as F
import os
import math



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

# Constants
MODEL_ID = "Hate-speech-CNERG/dehatebert-mono-english" 
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
TOXICITY_THRESHOLD = 0.5 # Keep 0.5 for this model

# Load Hugging Face emotion classification pipeline
emotion_classifier = pipeline("text-classification", model="SamLowe/roberta-base-go_emotions", top_k=3)

# pydantic schemas : 
class ChatText(BaseModel): 
    chatText: str

class ChatSession(BaseModel):
    messages: List[str]
    startTimestamp: float
    endTimestamp: float
    sessionId: str



@app.get("/")
def root():
    return {"Hello FastAPI"}

@app.post("/analyze-emotion")
async def analyze_emotion(data: ChatText):
    # Run model inference
    results = emotion_classifier(data.text)
    return {"text": data.text, "emotions": results}



@app.post("/chat-text-data")
async def receive_chat_data(session: ChatSession):
    try:
        logger.info("=== NEW CHAT SESSION RECEIVED ===")
        logger.info(f"Session ID: {session.sessionId}")
        
        if session.startTimestamp and session.endTimestamp:
            duration_sec = (session.endTimestamp - session.startTimestamp) / 1000
            logger.info(f"Session duration: {duration_sec:.2f} seconds")
        
        analysis = []
        # Log each message individually
        if session.messages:
            logger.info(f"Number of messages: {len(session.messages)}")
            for i, message in enumerate(session.messages, 1):
                logger.info(f"Message {i}: '{message}'")
                
            # run models for each message in the session 
            for message in session.messages:
                # toxicity detection model and static feedback
                toxicity_inference = predict_toxicity(message)
                feedback = generate_feedback(toxicity_inference["toxicity_score"])

                # mood detection model 
                raw_emotions = emotion_classifier(message)[0]  
                emotions = [{"label": e["label"], "score": float(e["score"])} for e in raw_emotions]

                analysis.append({
                    "message": message,
                    "toxicity_inference": toxicity_inference,
                    "feedback": feedback,
                    "startTimestamp": session.startTimestamp,
                    "endTimestamp": session.endTimestamp,
                    "emotions": emotions
                })
        else:
            logger.warning("No messages received in this session")
        


        logger.info("=== END OF SESSION ===")
        
        return {
            "status": "success",
            "session_id": session.sessionId,
            "duration_sec": duration_sec,
            "analysis": analysis
        }
        
    except Exception as e:
        logger.error(f"Error processing chat data: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# method which executes the tiny_toxicity model to predict toxicity score
def predict_toxicity(message: str):
    toxicity_inference = {}
    
    # 1. Tokenize the input text
    inputs = tokenizer(
        message, 
        return_tensors="pt", 
        truncation=True, 
        max_length=512, 
        padding=True # Use True for dynamic padding or "max_length" if necessary
    ).to(DEVICE)

    # 🛑 No need to delete 'token_type_ids' for standard BERT models. 
    # They handle the argument even if the input is a single sentence.

    # 2. Run inference
    with torch.no_grad():
        outputs = model(**inputs)
        
        # Apply Softmax to convert raw logits to probabilities
        # dim=-1 ensures we apply softmax across the class dimension (e.g., [1, 2])
        probabilities = torch.softmax(outputs.logits, dim=-1).squeeze().cpu().numpy()
        
    # DeHateBERT: The model outputs probabilities for two classes (index 0: Non-Hate, index 1: Hate)
    # We want the probability for the "Hate" class (index 1)
    score = float(probabilities[1])
    
    # 3. Post-process
    is_toxic = score >= TOXICITY_THRESHOLD

    toxicity_inference["is_toxic"] = is_toxic
    toxicity_inference["toxicity_score"] = score
    
    # 4. Return the structured response
    return toxicity_inference

# method to generate static feedback messages based on certain values of toxicity score 
def generate_feedback(score: float) -> str:
    """Generate constructive feedback"""

    feedback_map = {
        0.9: "🚫 High Toxicity Detected. This content is severely offensive and highly toxic",
        0.8: "🚨 Strong Warning. This comment contains highly toxic or abusive language. Please edit immediately.",
        0.7: "😠 Toxic Language Detected. Your language is aggressive or harmful. Consider revising your tone.",
        0.6: "🤔 Moderate Toxicity. Parts of your comment could be considered offensive by others.",
        0.5: "⚠️ Mildly Toxic. Your language is on the border of acceptable speech. Keep it respectful.",
        0.0: "✅ Content is classified as non-toxic. Thank you for your respectful communication."
    }
    
    for threshold in sorted(feedback_map.keys(), reverse=True):
        if score >= threshold:
            # The first threshold we meet is the highest one applicable
            return feedback_map[threshold]
    
    # Fallback (should be covered by the 0.0 entry, but included for robustness)
    return feedback_map[0.0]


'''
--------- Toxicity model configuration and logic --------- 
'''

# Model Loading on Startup

# Global variables to hold the loaded resources
model = None
tokenizer = None

@app.on_event("startup")
def load_model():
    """Load the DeHateBERT model and tokenizer using standard Auto classes."""
    global model, tokenizer
    
    try:
        # Load the tokenizer and model using the standard Auto classes
        tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
        # Use AutoModelForSequenceClassification for classification tasks
        model = AutoModelForSequenceClassification.from_pretrained(MODEL_ID)
        
        # Move to GPU/CPU and set to evaluation mode
        model.to(DEVICE)
        model.eval() 
        print(f"Model {MODEL_ID} loaded successfully on {DEVICE}.")

    except Exception as e:
        print(f"Error loading model: {e}")