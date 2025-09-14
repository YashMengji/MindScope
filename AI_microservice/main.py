from fastapi import FastAPI, Request 

app = FastAPI()

@app.get("/")
def root():
    return {"Hello FastAPI"}

@app.post("/chat-text-data")
def get_chat_text_data(request: Request):
    print(request.body())