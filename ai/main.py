from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import os
from dotenv import load_dotenv
import google.generativeai as genai
from langchain_ollama import OllamaLLM

load_dotenv()

app = FastAPI(title="SmartPM AI Service")

# Configure Gemini
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model_gemini = genai.GenerativeModel('gemini-pro')

# Configure Ollama
ollama_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
model_ollama = OllamaLLM(model="llama3", base_url=ollama_url)

class Task(BaseModel):
    id: str
    name: str
    type: str # LLR, LLT, HLT, Code, Review
    duration: float # hours
    dependencies: List[str] = []

class PlanningRequest(BaseModel):
    project_id: str
    tasks: List[Task]
    working_hours: List[str] = ["08:00-12:00", "14:00-17:00"]

@app.get("/")
async def root():
    return {"message": "SmartPM AI Service is Running"}

@app.post("/plan")
async def auto_plan(request: PlanningRequest):
    prompt = f"""
    As an Aerospace Project Manager, create an optimal schedule for the following tasks:
    {request.tasks}
    Working hours: {request.working_hours}
    Handle dependencies (V-cycle: LLR -> LLT -> HLT).
    Author must finish before reviewer can start.
    Return a JSON with start_time, end_time and assigned_role for each task.
    """
    try:
        response = model_gemini.generate_content(prompt)
        return {"project_id": request.project_id, "schedule": response.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/risk")
async def detect_risk(task_id: str, context: str):
    prompt = f"Analyze risk for task {task_id} with context: {context}. Predict delay probability."
    try:
        # Using Ollama for local risk detection
        response = model_ollama.invoke(prompt)
        return {"task_id": task_id, "risk_analysis": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health():
    return {"status": "ok"}
