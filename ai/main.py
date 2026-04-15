from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
import google.generativeai as genai
import httpx
import asyncio

# Load .env manually
def load_env():
  env_path = os.path.join(os.path.dirname(__file__), '.env')
  if os.path.exists(env_path):
    with open(env_path, encoding='utf-8', errors='ignore') as f:
      for line in f:
        line = line.strip().replace('\x00', '')
        if line and not line.startswith('#') and '=' in line:
          key, _, val = line.partition('=')
          os.environ.setdefault(key.strip(), val.strip())
load_env()

# Configure Gemini (old SDK — google-generativeai)
api_key = os.environ.get("GEMINI_API_KEY", "")
genai.configure(api_key=api_key)
model = genai.GenerativeModel("gemini-2.5-flash")

# Configure OpenAI
from openai import AsyncOpenAI

# Load backend env variables to get OPENAI_API_KEY
backend_env_path = os.path.join(os.path.dirname(__file__), '..', 'backend', '.env')
if os.path.exists(backend_env_path):
  with open(backend_env_path, encoding='utf-8', errors='ignore') as f:
    for line in f:
      line = line.strip().replace('\x00', '')
      if line and not line.startswith('#') and '=' in line:
        key, _, val = line.partition('=')
        os.environ.setdefault(key.strip(), val.strip())

openai_api_key = os.environ.get("OPENAI_API_KEY", "")
openai_client = AsyncOpenAI(api_key=openai_api_key) if openai_api_key else None


# Configure MongoDB motor client
import motor.motor_asyncio
import json
from bson.objectid import ObjectId
from datetime import datetime, date

class JSONEncoder(json.JSONEncoder):
  def default(self, o):
    if isinstance(o, ObjectId):
      return str(o)
    if isinstance(o, (datetime, date)):
      return o.isoformat()
    return super().default(o)


def get_db():
  backend_env_path = os.path.join(os.path.dirname(__file__), '..', 'backend', '.env')
  if os.path.exists(backend_env_path):
    with open(backend_env_path, encoding='utf-8', errors='ignore') as f:
      for line in f:
        line = line.strip().replace('\x00', '')
        if line and not line.startswith('#') and '=' in line:
          key, _, val = line.partition('=')
          if key.strip() == "MONGODB_CLOUD_URI":
            return motor.motor_asyncio.AsyncIOMotorClient(val.strip())["smartpm"]
  return motor.motor_asyncio.AsyncIOMotorClient("mongodb+srv://raissimaher:melek@cluster0.ihmh6wl.mongodb.net/smartpm?retryWrites=true&w=majority")["smartpm"]

db = get_db()

app = FastAPI(title="SmartPM AI Service")

app.add_middleware(
  CORSMiddleware,
  allow_origins=["*"],
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)

# ── MODELS ───────────────────────────────────────────────────────
class ChatMessage(BaseModel):
  role: str
  content: str

class ChatRequest(BaseModel):
  message: str
  history: Optional[List[ChatMessage]] = []
  context: Optional[str] = ""

class Task(BaseModel):
  id: str
  name: str
  phase: str
  duration: float

class TeamMember(BaseModel):
  id: str
  name: str
  certifications: List[str]

class PlanningRequest(BaseModel):
  project_id: str
  tasks: List[Task]
  team: List[TeamMember]

from fastapi.responses import StreamingResponse

# ── CHAT ─────────────────────────────────────────────────────────
@app.post("/chat")
async def chat(request: ChatRequest):
  # Fetch DB Context
  try:
    projects_cur = db.projects.find({}, {"name": 1, "status": 1, "_id": 1, "description": 1, "progress": 1, "startDate": 1, "endDate": 1, "manager": 1, "team": 1})
    projects = await projects_cur.to_list(length=100)
    
    tasks_cur = db.tasks.find({}, {"title": 1, "status": 1, "assignedTo": 1, "project": 1, "priority": 1, "estimatedHours": 1, "actualHours": 1})
    tasks = await tasks_cur.to_list(length=200)

    users_cur = db.users.find({}, {"firstName": 1, "lastName": 1, "email": 1, "role": 1, "certifications": 1})
    users = await users_cur.to_list(length=100)

    db_context = {
      "projects": projects,
      "tasks": tasks,
      "users": users
    }
    db_context_str = json.dumps(db_context, cls=JSONEncoder)
  except Exception as e:
    db_context_str = f"Erreur d'accès à la BD: {str(e)}"

  system = (
    "Tu es SmartPM AI, un assistant intelligent et expert exclusif en gestion de projet (plateforme SmartPM). "
    "Directives (TRÈS IMPORTANT) :\n"
    "1. Sois très simple, direct, naturel et concis dans tes réponses.\n"
    "2. Ne mets SURTOUT PAS de titres/en-têtes inutiles (comme ### Salutations) pour de petits messages.\n"
    "3. Utilise le formatage (listes -, texte en **gras**) UNIQUEMENT quand tu as besoin d'énumérer des informations de projet, pas dans la conversation normale.\n\n"
    f"[BASE DE DONNÉES EN TEMPS RÉEL (JSON)] :\n{db_context_str}\n\n"
    "Utilise ces données pour répondre avec précision à n'importe quelle question sur les projets, les tâches, l'équipe ou les rôles.\n\n"
  )
  if request.context:
    system += f"[CONTEXTE UTILISATEUR] : {request.context}\nUtilise ces informations si l'utilisateur pose des questions sur ses projets ou lui-même."
  
  recent = (request.history or [])[-3:]
  hist = "".join(
    f"\n{'User' if m.role == 'user' else 'Assistant'}: {m.content}"
    for m in recent
  )
  prompt = f"{system}{hist}\nUser: {request.message}\nAssistant:"
  
  generation_config = genai.types.GenerationConfig(
    temperature=0.4,
    top_p=0.8,
    top_k=40
  )

  async def stream_generator():
    # 1. TRY GEMINI (Cloud - Primary)
    try:
      response = await model.generate_content_async(
        prompt, 
        generation_config=generation_config, 
        stream=True
      )
      async for chunk in response:
        if chunk.text:
          yield chunk.text
      return # Success!
    except Exception as e_gemini:
      # 2. FALLBACK TO OPENAI (Cloud)
      if openai_client:
        print(f"Gemini failed, trying OpenAI... Error: {e_gemini}")
        try:
          messages = [{"role": "system", "content": system}]
          for m in recent:
            messages.append({"role": m.role, "content": m.content})
          messages.append({"role": "user", "content": request.message})
          
          stream = await openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            stream=True,
          )
          async for chunk_openai in stream:
            content = chunk_openai.choices[0].delta.content
            if content:
              yield content
        except Exception as e_openai:
          yield f"\n\n**Gemini Error**: {str(e_gemini)}\n**OpenAI Error**: {str(e_openai)}"
      else:
        yield f"\n\n**Gemini Error**: {str(e_gemini)}"

  return StreamingResponse(stream_generator(), media_type="text/plain")


# ── AUTO PLAN ────────────────────────────────────────────────────
@app.post("/plan")
def auto_plan(request: PlanningRequest):
  prompt = f"""You are a expert. Assign Authors and Reviewers.
RULES: author_id MUST NOT equal reviewer_id. Only assign certified members.
Team: {[t.dict() for t in request.team]}
Tasks: {[t.dict() for t in request.tasks]}
Return ONLY a raw JSON array: [{{"task_id":"T1","author_id":"U1","reviewer_id":"U2"}}]"""
  try:
    resp = model.generate_content(prompt)
    return {"project_id": request.project_id, "assignments": resp.text}
  except Exception as e:
    raise HTTPException(status_code=500, detail=str(e))

# ── RISK ─────────────────────────────────────────────────────────
@app.post("/risk")
def detect_risk(task_id: str, context: str):
  prompt = f"Analyze risk for task {task_id}: {context}. Give delay probability in 2 sentences."
  try:
    resp = model.generate_content(prompt)
    return {"task_id": task_id, "risk_analysis": resp.text}
  except Exception as e:
    raise HTTPException(status_code=500, detail=str(e))

# ── HEALTH ───────────────────────────────────────────────────────
@app.get("/")
@app.get("/health")
async def health():
  return {"status": "ok", "service": "SmartPM AI", "model": "gemini-1.5-flash"}
