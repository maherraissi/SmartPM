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
    phase: str # HLR, LLR, LLT, HLT, Code
    duration: float # hours

class TeamMember(BaseModel):
    id: str
    name: str
    certifications: List[str] # Phases they are legally certified to execute/review

class PlanningRequest(BaseModel):
    project_id: str
    tasks: List[Task]
    team: List[TeamMember]

@app.get("/")
async def root():
    return {"message": "SmartPM AI Service is Running"}

@app.post("/plan")
async def auto_plan(request: PlanningRequest):
    prompt = f"""
    You are an AI specialized in DO-178C Aerospace Project Management.
    Your job is to strictly assign Authors and Reviewers for a V-cycle project.
    
    RULES:
    1. For every task, assign exactly ONE 'author_id' and ONE 'reviewer_id'.
    2. THE GOLDEN RULE: 'author_id' MUST NEVER BE THE SAME AS 'reviewer_id' for any given task. This is an absolute strict DO-178C requirement.
    3. You can only assign a team member to a task if their 'certifications' list includes the task's 'phase'.
    4. Balance the workload evenly among the certified team members.

    DATA:
    Team Details: {[t.dict() for t in request.team]}
    Tasks: {[t.dict() for t in request.tasks]}

    FORMAT:
    Return ONLY a highly structured RAW JSON array. No markdown code blocks. 
    Format example: [{{"task_id": "T1", "author_id": "U1", "reviewer_id": "U2"}}]
    """
    try:
        response = model_gemini.generate_content(prompt)
        return {"project_id": request.project_id, "assignments": response.text}
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
