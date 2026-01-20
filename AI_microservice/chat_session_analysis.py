from google import genai
from google.genai import types
from pydantic import BaseModel, Field
from typing import Annotated
from dotenv import load_dotenv
import os

load_dotenv()
api_key = os.getenv("CHAT_ANALYSIS_API_KEY")

client = genai.Client(api_key=api_key)

system_instructions = (
    """
    You are a chat moderator assistant.
    Your goal is to analyze a list of chat messages from a single session.Provide a toxicity score (0.0 to 1.0) and a single sentence of constructive feedback to improve the conversation quality.
    Return the output strictly in JSON format.
    """
)

class ChatToxicityInference(BaseModel):
    toxicity_score: Annotated[
        float, Field("Toxicity score between 0.0 to 1.0")
    ]
    feedback: Annotated[
        str, Field("A Constructive on line feedback based on the toxicity score")
    ]


def analyze_chat_session(chat_messages):
    
    response = client.models.generate_content(
        model="gemini-2.5-flash-lite",
        contents=f"Analyze the following chat session:\n{chat_messages}",
        config=types.GenerateContentConfig(
            system_instruction=system_instructions,
            response_mime_type="application/json",
            response_schema=ChatToxicityInference,
        ),
    )
    return response.text

# testing purpose 
# chat_messages = [
#     "Hey, why is the code not working?",
#     "You are being really unhelpful right now.",
#     "Forget it, I'll do it myself, you're useless."
# ]
# analyze_chat_session(chat_messages)