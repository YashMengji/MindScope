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
CURRENT_MODEL_NAME = "models/gemini-2.5-flash" # Default fallback (multimodal: text + audio)

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
        
        # Priority list: Look for these models in order (newest first).
        # All are multimodal (text + audio) and free-tier eligible.
        priority_models = [
            "models/gemini-3-flash",        # newest, if available to this key
            "models/gemini-2.5-flash",      # reliable free-tier multimodal default
            "models/gemini-2.5-flash-lite", # cheapest free-tier fallback
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

    # 2. LOAD LOCAL EMOTION MODEL (gate for the hybrid pipeline)
    # DeHateBERT stays disabled — we derive toxicity from go_emotions instead.
    try:
        logger.info("Loading Emotion Classifier (SamLowe/roberta-base-go_emotions)...")
        # top_k=None returns the score for EVERY emotion label, not just the top few,
        # so we can sum the hostile-emotion probabilities ourselves.
        emotion_classifier = pipeline(
            "text-classification",
            model="SamLowe/roberta-base-go_emotions",
            top_k=None,
        )
        logger.info("✅ Emotion classifier loaded.")
    except Exception as e:
        emotion_classifier = None
        logger.warning(f"⚠️ Could not load emotion classifier — will fall back to Gemini-direct. {e}")

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

        return result_json
        

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

# --------------------------------------------------------------------------
# HYBRID PIPELINE: local emotion model gates the Gemini call
# --------------------------------------------------------------------------

# Hostile GoEmotions labels whose combined probability we treat as "toxicity".
TOXIC_EMOTIONS = {"anger", "annoyance", "disgust", "disapproval"}

# Above this, the conversation is sent to Gemini to generate feedback.
HYBRID_TOXICITY_GATE = 0.20

# Shown when the conversation stays below the gate (no Gemini call).
HEALTHY_FEEDBACK = [
    "Conversation tone looks healthy.",
    "Keep communicating respectfully.",
]


def compute_toxicity_from_emotions(messages: List[str]) -> float:
    """
    Derive a 0.0–1.0 toxicity score from the go_emotions classifier.

    For each message we sum the probabilities of the hostile emotions
    (anger, annoyance, disgust, disapproval) and cap at 1.0; the session
    score is the worst (max) single message, so one hostile line can trip
    the gate. Returns 0.0 for empty input.
    """
    if not messages or emotion_classifier is None:
        return 0.0

    worst = 0.0
    for message in messages:
        if not message or not message.strip():
            continue
        # pipeline(..., top_k=None) returns [[{label, score}, ...]] for one input.
        predictions = emotion_classifier(message)
        if predictions and isinstance(predictions[0], list):
            predictions = predictions[0]

        score = sum(
            p["score"] for p in predictions if p["label"] in TOXIC_EMOTIONS
        )
        score = min(score, 1.0)
        worst = max(worst, score)

    return worst


def generate_feedback_gemini(messages: List[str]) -> List[str]:
    """
    Use Gemini to generate exactly two lines of constructive feedback.
    The toxicity score Gemini may produce is intentionally discarded — the
    canonical score comes from the local emotion model.
    """
    prompt = f"""
     Analyze the following conversation for communication patterns.
    Provide your analysis in the exact JSON structure specified below.

    CONVERSATION MESSAGES:
    {messages}

    INSTRUCTIONS:
    1. First, carefully read and understand all messages in the conversation
    2. Provide EXACTLY TWO lines of constructive, non-judgmental feedback:
       - Line 1: Specific observation about communication patterns
       - Line 2: Constructive suggestion for improvement
    3. Keep feedback supportive and focused on communication skills

    IMPORTANT RULES:
    - Provide ONLY the JSON output, no additional text
    - Feedback must be constructive, not accusatory. Also each line must be only of 10 words
    - Consider context and intent, not just individual words
    - Be culturally sensitive in your analysis

    REQUIRED JSON FORMAT (example):
    {{
        "feedback": [
            "First line of constructive feedback here",
            "Second line of constructive feedback here"
        ]
    }}

    Now provide your analysis:
    """

    try:
        # Call Gemini (shares the auto-discovered model with the audio endpoint)
        model = genai.GenerativeModel(CURRENT_MODEL_NAME)
        response = model.generate_content(prompt)

        # Extract JSON from response
        response_text = response.text.strip()

        # Clean up if there are markdown code blocks
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0].strip()
        elif "```" in response_text:
            response_text = response_text.split("```")[1].strip()

        result = json.loads(response_text)
        feedback = result.get("feedback")

        if not isinstance(feedback, list) or not feedback:
            return ["No feedback available.", "Try again."]

        # Ensure exactly two lines
        if len(feedback) < 2:
            feedback = feedback + ["Be mindful of language."]
        return feedback[:2]

    except Exception as e:
        logger.error(f"Gemini feedback generation failed: {e}")
        return [
            "Unable to analyze messages.",
            "Please try again later.",
        ]


def analyze_toxicity(messages: List[str]):
    """
    Hybrid pipeline entry point.
    Returns: {'toxicity_score': float, 'feedback': [str, str]}

    1. Score toxicity locally with the go_emotions model.
    2. If the model is unavailable, fall back to Gemini-direct (legacy behaviour).
    3. If toxicity > 20%, ask Gemini for feedback; otherwise return a static
       positive message and never touch Gemini.
    """
    # Graceful fallback: emotion model never loaded -> let Gemini do everything.
    if emotion_classifier is None:
        logger.warning("Emotion classifier unavailable — falling back to Gemini-direct scoring.")
        feedback = generate_feedback_gemini(messages)
        return {"toxicity_score": 0.0, "feedback": feedback}

    toxicity = compute_toxicity_from_emotions(messages)
    logger.info(f"Local emotion toxicity score: {toxicity:.3f} (gate: {HYBRID_TOXICITY_GATE})")

    if toxicity > HYBRID_TOXICITY_GATE:
        logger.info("Above gate → requesting Gemini feedback.")
        feedback = generate_feedback_gemini(messages)
    else:
        logger.info("Below gate → skipping Gemini, returning static feedback.")
        feedback = list(HEALTHY_FEEDBACK)

    return {"toxicity_score": toxicity, "feedback": feedback}

@app.post("/chat-text-data")
async def process_chat_data(session: ChatSession):
    # Simple call to the analysis function
    result = analyze_toxicity(session.messages)
    
    analysis = {
        "toxicityScore": result["toxicity_score"],
        "feedback": result["feedback"],
        "startTimestamp": session.startTimestamp,
        "endTimestamp": session.endTimestamp
    }
    # Return the exact format you wanted
    return {
        "status": "success",
        "session_id": session.sessionId,
        "analysis": analysis
    }

# @app.post("/analyze-emotion")
# async def analyze_emotion(data: ChatText):
#     if not emotion_classifier:
#         raise HTTPException(status_code=503, detail="Emotion model not loaded")
#     results = emotion_classifier(data.chatText)
#     return {"text": data.chatText, "emotions": results}

# def predict_toxicity_local(message: str):
#     if not tokenizer or not model: return {"toxicity_score": 0.0}
#     inputs = tokenizer(message, return_tensors="pt", truncation=True, max_length=512, padding=True).to(DEVICE)
#     with torch.no_grad():
#         outputs = model(**inputs)
#         probabilities = torch.softmax(outputs.logits, dim=-1).squeeze().cpu().numpy()
#     score = float(probabilities[1])
#     return {"is_toxic": score >= TOXICITY_THRESHOLD, "toxicity_score": score}

# @app.post("/chat-text-data")
# async def receive_chat_data(session: ChatSession):
#     try:
#         logger.info(f"=== NEW CHAT SESSION: {session.sessionId} ===")
#         analysis = []
#         if session.messages:
#             for message in session.messages:
#                 toxicity_inference = predict_toxicity_local(message)
#                 fb = "Please be more polite." if toxicity_inference["is_toxic"] else "Good job."
                
#                 raw_emotions = emotion_classifier(message)[0] if emotion_classifier else []
#                 emotions = [{"label": e["label"], "score": float(e["score"])} for e in raw_emotions]

#                 analysis.append({
#                     "message": message,
#                     "toxicity_inference": toxicity_inference,
#                     "feedback": fb,
#                     "emotions": emotions
#                 })
        
#         return {
#             "status": "success",
#             "session_id": session.sessionId,
#             "analysis": analysis
#         }
#     except Exception as e:
#         logger.error(f"Error processing chat data: {e}")
#         raise HTTPException(status_code=500, detail=str(e))