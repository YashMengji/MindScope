from fastapi import FastAPI, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import List, Optional
import logging
import shutil
import json
import os
import time

# ✅ Google Gemini SDK
import google.generativeai as genai
from google.generativeai.types import HarmCategory, HarmBlockThreshold
from chat_session_analysis import analyze_chat_session

# ✅ Local ML Imports
from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification
import torch
from dotenv import load_dotenv

# ✅ Initialize logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables from .env file immediately
load_dotenv()

app = FastAPI()

from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------------------------------------------------------------------
# CONFIGURATION
# --------------------------------------------------------------------------

# 🔑 SET YOUR GEMINI API KEY HERE
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "AIzaSy...") 
if not GOOGLE_API_KEY:
    raise ValueError("❌ GOOGLE_API_KEY not found! Check your .env file.")
genai.configure(api_key=GOOGLE_API_KEY)

# Constants for Local Models
MODEL_ID = "Hate-speech-CNERG/dehatebert-mono-english" 
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
TOXICITY_THRESHOLD = 0.5 

# GLOBAL VARIABLE FOR THE CORRECT MODEL NAME
CURRENT_MODEL_NAME = "gemini-1.5-flash-001" # Default fallback

# --------------------------------------------------------------------------
# GLOBAL RESOURCES & MODEL AUTO-DISCOVERY
# --------------------------------------------------------------------------
model = None
tokenizer = None
emotion_classifier = None  

@app.on_event("startup")
def load_resources():
    """Load Local Models AND find the correct Gemini Model name."""
    global model, tokenizer, emotion_classifier, CURRENT_MODEL_NAME
    
    # 1. AUTO-DISCOVER CORRECT GEMINI MODEL
    try:
        logger.info("🔎 Connecting to Google to find available models...")
        available_models = [m.name for m in genai.list_models()]
        
        # Priority list: Look for these models in order
        priority_models = [
            "models/gemini-1.5-flash",
            "models/gemini-1.5-flash-001",
            "models/gemini-1.5-flash-latest",
            "models/gemini-pro"
        ]
        
        found = False
        for p_model in priority_models:
            if p_model in available_models:
                CURRENT_MODEL_NAME = p_model
                found = True
                break
        
        # Fallback: Just take the first one that has "flash" in the name
        if not found:
            for m_name in available_models:
                if "flash" in m_name:
                    CURRENT_MODEL_NAME = m_name
                    found = True
                    break
        
        logger.info(f"✅ SELECTED GEMINI MODEL: {CURRENT_MODEL_NAME}")
        
    except Exception as e:
        logger.warning(f"⚠️ Could not auto-discover models (Check API Key). Defaulting to: {CURRENT_MODEL_NAME}")
        logger.error(e)

    # 2. LOAD LOCAL MODELS
    # try:
    #     logger.info("Loading DeHateBERT model...")
    #     tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
    #     model = AutoModelForSequenceClassification.from_pretrained(MODEL_ID)
    #     model.to(DEVICE)
    #     model.eval()

    #     logger.info("Loading Emotion Classifier...")
    #     emotion_classifier = pipeline("text-classification", model="SamLowe/roberta-base-go_emotions", top_k=3)
    # except Exception as e:
    #     logger.error(f"Error loading local models: {e}")

# --------------------------------------------------------------------------
# PYDANTIC SCHEMAS
# --------------------------------------------------------------------------
class ChatText(BaseModel): 
    chatText: str

class ChatSession(BaseModel):
    messages: List[str]
    startTimestamp: float
    endTimestamp: float
    sessionId: str

# --------------------------------------------------------------------------
# ENDPOINTS
# --------------------------------------------------------------------------

@app.get("/")
def root():
    return {"message": "Hello FastAPI", "using_model": CURRENT_MODEL_NAME}

# ✅ ROBUST ENDPOINT: AUDIO ANALYSIS
@app.post("/analyze")
async def analyze_audio(file: UploadFile = File(...)):
    """
    1. Uploads audio directly to Google Gemini.
    2. WAITS for processing.
    3. Analyzes toxicity using the Auto-Discovered Model.
    """
    temp_filename = f"temp_{file.filename}"
    myfile = None
    
    try:
        # 1. Save locally
        with open(temp_filename, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        logger.info(f"Audio file received: {file.filename}")

        # 2. Upload to Gemini
        myfile = genai.upload_file(temp_filename)
        logger.info(f"File uploaded: {myfile.name}")

        # 3. Wait for processing (Critical)
        while myfile.state.name == "PROCESSING":
            logger.info("File is processing... waiting 1s")
            time.sleep(1)
            myfile = genai.get_file(myfile.name)

        if myfile.state.name == "FAILED":
            raise ValueError("Google failed to process the audio file.")
        
        logger.info("File is ACTIVE.")

        # 4. Initialize the AUTO-DISCOVERED Model
        # Note: We remove 'models/' prefix if the SDK adds it automatically, but usually it handles both.
        clean_model_name = CURRENT_MODEL_NAME.replace("models/", "")
        model_gemini = genai.GenerativeModel(clean_model_name)

        # 5. Define Prompt
        prompt = """
        Listen to this audio. You are analyzing the spoken language used by the main speaker.
        
        Task:
        1. Rate toxicity on a scale of 0.0 to 1.0 based on insults, threats, or hate speech.
        2. Provide exactly 2–3 short, constructive feedback lines.
        3. Return JSON only.
        
        Output format:
        {
          "toxicity_score": number,
          "feedback": [string, string]
        }
        """

        # 6. Generate Content
        response = model_gemini.generate_content(
            [myfile, prompt],
            generation_config={"response_mime_type": "application/json"},
            safety_settings={
                HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
                HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
                HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
                HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
            }
        )

        # 7. Parse Response
        result_json = json.loads(response.text)
        logger.info(f"Analysis Complete: {result_json}")

        return {
            "status": "success",
            "model_used": clean_model_name,
            "analysis": result_json
        }

    except Exception as e:
        logger.error(f"Error in /analyze endpoint: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
        
    finally:
        # Cleanup local file
        if os.path.exists(temp_filename):
            os.remove(temp_filename)
        # Cleanup remote file to save space
        if myfile:
            try:
                genai.delete_file(myfile.name)
                logger.info("Remote file cleaned up.")
            except:
                pass

# (Existing endpoints for text chat below...)
@app.post("/analyze-emotion")
async def analyze_emotion(data: ChatText):
    if not emotion_classifier:
        raise HTTPException(status_code=503, detail="Emotion model not loaded")
    results = emotion_classifier(data.chatText)
    return {"text": data.chatText, "emotions": results}

def predict_toxicity_local(message: str):
    if not tokenizer or not model: return {"toxicity_score": 0.0}
    inputs = tokenizer(message, return_tensors="pt", truncation=True, max_length=512, padding=True).to(DEVICE)
    with torch.no_grad():
        outputs = model(**inputs)
        probabilities = torch.softmax(outputs.logits, dim=-1).squeeze().cpu().numpy()
    score = float(probabilities[1])
    return {"is_toxic": score >= TOXICITY_THRESHOLD, "toxicity_score": score}



@app.post("/chat-text-data")
def receive_chat_data(chat_session_data: ChatSession):
    print(chat_session_data)
    chat_inference = analyze_chat_session(chat_session_data)
    print(chat_inference)
    return {
        "status": "success",
        "session_id": chat_session_data.sessionId,
        "analysis": json.loads(chat_inference)
    }

