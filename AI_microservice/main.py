from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class ChatText(BaseModel): 
    chatText: str

@app.get("/")
def root():
    return {"Hello FastAPI"}

@app.post("/chat-text-data")
def get_chat_text_data(request_body : ChatText):
    print(request_body.chatText)
    return {"status": True}