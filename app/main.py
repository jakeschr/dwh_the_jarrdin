from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def root():
    return {"message": "DWH The Jarrdin API is ready!"}
