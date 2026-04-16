"""
SmartPM AI Service v2.0
"""
# Force UTF-8 on Windows
import sys
sys.stdout.reconfigure(encoding='utf-8')

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
import os
import google.generativeai as genai
import json
from datetime import datetime, date

# ── ENV ───────────────────────────────────────────────────────────
def load_env():
    for path in [
        os.path.join(os.path.dirname(__file__), '.env'),
        os.path.join(os.path.dirname(__file__), '..', 'backend', '.env'),
    ]:
        if os.path.exists(path):
            with open(path, encoding='utf-8', errors='ignore') as f:
                for line in f:
                    line = line.strip().replace('\x00', '')
                    if line and not line.startswith('#') and '=' in line:
                        key, _, val = line.partition('=')
                        os.environ.setdefault(key.strip(), val.strip())
load_env()

# ── AI CLIENTS ────────────────────────────────────────────────────
api_key = os.environ.get("GEMINI_API_KEY", "")
genai.configure(api_key=api_key)
gemini_model = genai.GenerativeModel("gemini-2.5-flash")

from openai import AsyncOpenAI
openai_api_key = os.environ.get("OPENAI_API_KEY", "")
openai_client = AsyncOpenAI(api_key=openai_api_key) if openai_api_key else None

# ── MONGODB ───────────────────────────────────────────────────────
import motor.motor_asyncio
from bson import ObjectId

class JSONEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, ObjectId): return str(o)
        if isinstance(o, (datetime, date)): return o.isoformat()
        return super().default(o)

MONGO_URI = os.environ.get("MONGODB_CLOUD_URI",
    "mongodb+srv://raissimaher:melek@cluster0.ihmh6wl.mongodb.net/smartpm?retryWrites=true&w=majority")
client_motor = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URI)
db = client_motor["smartpm"]

# ── OLLAMA ────────────────────────────────────────────────────────
import ollama

# ── APP ───────────────────────────────────────────────────────────
app = FastAPI(title="SmartPM AI Service", version="2.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# ── MODELS ───────────────────────────────────────────────────────
class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = []
    context: Optional[str] = ""

class SimulationRequest(BaseModel):
    project_id: str
    scenario: str
    duration_weeks: Optional[int] = 4
    model_name: Optional[str] = "llama3"
    variables: Optional[dict] = {}

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


# ── HELPER: get subactivity IDs for a project ────────────────────
async def _get_sub_ids(proj_oid, project_id_str: str) -> list:
    ids = []
    try:
        docs = await db.subactivities.find(
            {"$or": [{"projectId": proj_oid}, {"projectId": project_id_str}]},
            {"_id": 1}
        ).to_list(length=300)
        ids = [d["_id"] for d in docs]
    except Exception as e:
        print(f"[_get_sub_ids] {e}")
    return ids if ids else []


# ── HELPER: Fetch rich project context from DB ───────────────────
async def get_project_context(project_id: str) -> dict:
    try:
        # 1. Find project (try ObjectId + string)
        project = None
        proj_oid = None
        try:
            proj_oid = ObjectId(project_id)
            project = await db.projects.find_one({"_id": proj_oid})
        except Exception:
            pass
        if not project:
            project = await db.projects.find_one({"_id": project_id})
            proj_oid = None

        if not project:
            return {
                "error": f"Projet introuvable: {project_id}",
                "project": {
                    "id": project_id, "name": "Projet inconnu", "description":"N/A",
                    "status": "UNKNOWN", "progress": 0, "startDate": "N/A", "endDate": "N/A"
                },
                "team": [],
                "task_stats": {"total":0,"by_status":{},"overdue":[],"total_estimated_hours":0,"total_actual_hours":0,"efficiency_ratio":1.0},
                "activities": ["Aucune activite trouvee dans la base de donnees."]
            }

        # 2. Fetch tasks via subactivities
        tasks = []
        sub_ids = await _get_sub_ids(proj_oid or project_id, project_id)
        if sub_ids:
            tasks = await db.tasks.find({"subActivityId": {"$in": sub_ids}}).to_list(length=300)

        # 3. Fetch team members
        team_ids = project.get("teamMembers", [])
        team = []
        for mid in team_ids[:12]:
            try:
                user = await db.users.find_one({"_id": ObjectId(str(mid))})
                if user:
                    name = f"{user.get('firstName','')} {user.get('lastName','')}".strip() or user.get("email","?")
                    certs = user.get("certifications", [])
                    team.append({"name": name, "role": user.get("role","MEMBER"), "certifications": certs})
            except Exception:
                pass

        # 4. Task stats
        task_statuses: dict = {}
        overdue_tasks: list = []
        total_est = 0
        total_act = 0
        now = datetime.now()
        for t in tasks:
            s = t.get("status", "TODO")
            task_statuses[s] = task_statuses.get(s, 0) + 1
            total_est += t.get("estimatedDuration", 0) or 0
            total_act += t.get("actualDuration", 0) or 0
            if t.get("plannedEndDate") and s not in ("CLOSED", "REVIEWED"):
                try:
                    due = t["plannedEndDate"] if isinstance(t["plannedEndDate"], datetime) else \
                          datetime.fromisoformat(str(t["plannedEndDate"]).replace("Z",""))
                    if due < now:
                        overdue_tasks.append(t.get("title","?")[:60])
                except Exception:
                    pass

        # 5. Activities
        activity_docs = await db.activities.find(
            {"$or": [{"projectId": proj_oid}, {"projectId": project_id}]} if proj_oid else {"projectId": project_id}
        ).to_list(length=20)

        activity_summary = []
        for act in activity_docs:
            pct = act.get("progressPercentage", 0)
            activity_summary.append(f"  [{act.get('phase','?')}] {act.get('name','?')} — {pct}% complete")
        if not activity_summary:
            activity_summary = ["Aucune activite enregistree pour ce projet."]

        return {
            "project": {
                "id":          project_id,
                "name":        project.get("name", "?"),
                "description": project.get("description", "N/A"),
                "status":      project.get("status", "UNKNOWN"),
                "progress":    project.get("progress", 0),
                "startDate":   str(project.get("targetStartDate", project.get("startDate","N/A"))),
                "endDate":     str(project.get("targetEndDate", "N/A")),
            },
            "team": team,
            "task_stats": {
                "total":                 len(tasks),
                "by_status":             task_statuses,
                "overdue":               overdue_tasks[:8],
                "total_estimated_hours": total_est,
                "total_actual_hours":    total_act,
                "efficiency_ratio":      round(total_est / max(total_act, 1), 2),
            },
            "activities": activity_summary
        }

    except Exception as e:
        import traceback
        print(f"[get_project_context ERROR]\n{traceback.format_exc()}")
        return {
            "error": str(e),
            "project": {"id": project_id, "name":"Erreur BD","status":"UNKNOWN","progress":0,"description":"N/A","startDate":"N/A","endDate":"N/A"},
            "team": [],
            "task_stats": {"total":0,"by_status":{},"overdue":[],"total_estimated_hours":0,"total_actual_hours":0,"efficiency_ratio":1.0},
            "activities": ["Erreur d'acces a la base de donnees."]
        }


# ── CHAT ─────────────────────────────────────────────────────────
@app.post("/chat")
async def chat(request: ChatRequest):
    try:
        projects = await db.projects.find({}, {"name":1,"status":1,"description":1,"progress":1}).to_list(100)
        tasks    = await db.tasks.find({}, {"title":1,"status":1,"authorId":1,"estimatedDuration":1,"actualDuration":1}).to_list(200)
        users    = await db.users.find({}, {"firstName":1,"lastName":1,"email":1,"role":1,"certifications":1}).to_list(100)
        db_context_str = json.dumps({"projects": projects, "tasks": tasks, "users": users}, cls=JSONEncoder)
    except Exception as e:
        db_context_str = f"Erreur BD: {str(e)}"

    system = (
        "Tu es SmartPM AI, assistant expert en gestion de projet sur la plateforme SmartPM.\n"
        "Directives:\n"
        "1. Sois direct, concis et naturel.\n"
        "2. Utilise listes et **gras** pour les donnees de projets.\n\n"
        f"[BASE DE DONNEES EN TEMPS REEL]:\n{db_context_str}\n\n"
        "Utilise ces donnees pour repondre avec precision.\n"
    )
    if request.context:
        system += f"\n[CONTEXTE]: {request.context}"

    recent = (request.history or [])[-4:]
    hist = "".join(f"\n{'User' if m.role=='user' else 'Assistant'}: {m.content}" for m in recent)
    prompt = f"{system}{hist}\nUser: {request.message}\nAssistant:"

    generation_config = genai.types.GenerationConfig(temperature=0.4, top_p=0.8)

    async def stream_generator():
        try:
            response = await gemini_model.generate_content_async(prompt, generation_config=generation_config, stream=True)
            async for chunk in response:
                if chunk.text: yield chunk.text
            return
        except Exception as e_gemini:
            if openai_client:
                try:
                    messages = [{"role":"system","content":system}]
                    for m in recent: messages.append({"role":m.role,"content":m.content})
                    messages.append({"role":"user","content":request.message})
                    stream = await openai_client.chat.completions.create(model="gpt-4o-mini", messages=messages, stream=True)
                    async for chunk_oa in stream:
                        content = chunk_oa.choices[0].delta.content
                        if content: yield content
                except Exception as e_oa:
                    yield f"[Erreur Gemini: {str(e_gemini)}] [Erreur OpenAI: {str(e_oa)}]"
            else:
                yield f"[Erreur Gemini: {str(e_gemini)}]"

    return StreamingResponse(stream_generator(), media_type="text/plain")


# ── SIMULATE — Ollama with full DB context ────────────────────────
@app.post("/simulate")
async def simulate_project(request: SimulationRequest):
    ctx             = await get_project_context(request.project_id)
    project_info    = ctx["project"]
    team_info       = ctx["team"]
    task_stats      = ctx["task_stats"]
    activity_lines  = ctx["activities"]
    db_error        = ctx.get("error","")

    # Build human-readable context block
    team_str    = "\n".join([f"  - {m['name']} ({m['role']}) | Certs: {', '.join(m.get('certifications',[]))}" for m in team_info]) or "  Donnees equipe non disponibles"
    act_str     = "\n".join(activity_lines) if activity_lines else "  Aucune activite"
    overdue_str = "\n  ".join(ctx["task_stats"].get("overdue",[]) or ["Aucune"])
    status_str  = json.dumps(task_stats.get("by_status",{}), ensure_ascii=False)
    warning_str = f"\n[AVERTISSEMENT BD]: {db_error}" if db_error else ""

    prompt = f"""Tu es SmartPM Simulator — moteur expert d'analyse predictive pour projets logiciels critiques.{warning_str}

=================================================================
DONNEES REELLES DU PROJET (Base MongoDB SmartPM)
=================================================================
Projet         : {project_info['name']}
Description    : {project_info['description']}
Statut actuel  : {project_info['status']}
Avancement     : {project_info['progress']}%
Date debut     : {project_info['startDate']}
Date fin prev. : {project_info['endDate']}

Equipe ({len(team_info)} membres) :
{team_str}

Statistiques Taches ({task_stats['total']} taches) :
  Par statut         : {status_str}
  Taches en retard   : {overdue_str}
  Heures estimees    : {task_stats.get('total_estimated_hours',0)}h
  Heures reelles     : {task_stats.get('total_actual_hours',0)}h
  Ratio efficacite   : {task_stats.get('efficiency_ratio',1.0)}

Phases & Activites :
{act_str}

=================================================================
SCENARIO A ANALYSER
=================================================================
Scenario       : {request.scenario}
Horizon        : {request.duration_weeks} semaines
Variables supp.: {json.dumps(request.variables or {}, ensure_ascii=False)}

=================================================================
RAPPORT REQUIS — Structure obligatoire (8 sections)
=================================================================

## 1. RESUME EXECUTIF
[Impact global du scenario sur ce projet specifique. 3-4 phrases precises.]

## 2. ANALYSE D'IMPACT DETAILLEE
### 2a. Impact Planning
[Decalages precis en jours/semaines sur les jalons, phases affectees]
### 2b. Impact Ressources
[Charge equipe, goulots d'etranglement, disponibilite membres]
### 2c. Impact Financier
[Estimation surcoûts en % ou heures supplementaires]

## 3. MATRICE DES RISQUES
| Risque | Probabilite | Severite | Impact Global |
|--------|-------------|----------|---------------|
[Remplis 4-6 lignes avec les risques identifies depuis le contexte reel]

## 4. TACHES ET PHASES CRITIQUES AFFECTEES
[Liste priorisee des taches/phases directement touchees, avec ordre d'urgence]

## 5. SCENARIOS PROBABILISTES
### Optimiste (P10) — Si tout se passe bien
### Nominal (P50) — Cas le plus probable
### Pessimiste (P90) — Si les risques s'accumulent

## 6. PLAN D'ACTION RECOMMANDE (7 actions)
1. [Action immediate — dans les 48h]
2. [Action court terme — semaine 1]
3. [Action court terme — semaine 2]
4. [Action moyen terme — semaines 3-4]
5. [Mitigation risque principal]
6. [Ajustement ressources]
7. [Indicateur de validation]

## 7. KPIs DE SUIVI
[3-5 metriques avec seuils d'alerte verts/oranges/rouges]

## 8. RECOMMANDATION FINALE
[GO / GO CONDITIONNEL / NO-GO — avec justification claire en 2-3 phrases]

Utilise les donnees reelles ci-dessus pour personnaliser CHAQUE section. Sois precis et professionnel.
"""

    model_name = request.model_name or "llama3"

    async def ollama_stream():
        try:
            stream = ollama.chat(
                model=model_name,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "Tu es un expert senior en gestion de projets logiciels critiques (avionique, spatial, automobile). "
                            "Tu parles exclusivement francais. Tes rapports sont structures, precis et directement actionnables. "
                            "Tu utilises les donnees reelles du projet pour personaliser chaque section de ton analyse."
                        )
                    },
                    {"role": "user", "content": prompt}
                ],
                stream=True,
                options={
                    "temperature":     0.25,
                    "num_predict":     2500,
                    "top_p":           0.85,
                    "repeat_penalty":  1.15,
                    "num_ctx":         4096,
                }
            )
            for chunk in stream:
                content = chunk.get("message", {}).get("content", "")
                if content:
                    yield content

        except Exception as e:
            err_str = str(e)
            if "not found" in err_str.lower():
                yield (
                    f"\nModele '{model_name}' non trouve dans Ollama.\n\n"
                    f"Pour l'installer:\n  ollama pull {model_name}\n\n"
                    f"Modeles recommandes:\n  ollama pull llama3\n  ollama pull mistral\n  ollama pull phi3"
                )
            elif "connection" in err_str.lower() or "refused" in err_str.lower():
                yield (
                    f"\nOllama n'est pas accessible.\n\n"
                    f"Solution:\n  1. Ouvrez un terminal\n  2. Executez: ollama serve\n  3. Relancez la simulation\n\n"
                    f"Erreur: {err_str}"
                )
            else:
                yield f"\nErreur Simulation: {err_str}"

    return StreamingResponse(ollama_stream(), media_type="text/plain")


# ── LIST OLLAMA MODELS ────────────────────────────────────────────
@app.get("/simulate/models")
async def list_ollama_models():
    try:
        result = ollama.list()
        models = [m.get("model", m.get("name","?")) for m in result.get("models", [])]
        return {"models": models}
    except Exception as e:
        return {"models": [], "error": str(e)}


# ── AUTO PLAN ────────────────────────────────────────────────────
@app.post("/plan")
def auto_plan(request: PlanningRequest):
    prompt = f"""You are an expert project planner. Assign Authors and Reviewers.
RULES: author_id MUST NOT equal reviewer_id.
Team: {[t.dict() for t in request.team]}
Tasks: {[t.dict() for t in request.tasks]}
Return ONLY a raw JSON array: [{{"task_id":"T1","author_id":"U1","reviewer_id":"U2"}}]"""
    try:
        resp = gemini_model.generate_content(prompt)
        return {"project_id": request.project_id, "assignments": resp.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── RISK ──────────────────────────────────────────────────────────
@app.post("/risk")
def detect_risk(task_id: str, context: str):
    prompt = f"Analyze risk for task {task_id}: {context}. Give delay probability in 2 sentences."
    try:
        resp = gemini_model.generate_content(prompt)
        return {"task_id": task_id, "risk_analysis": resp.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── STATUS ────────────────────────────────────────────────────────
@app.get("/status")
async def ai_status():
    ollama_status = "offline"
    ollama_models = []
    try:
        result = ollama.list()
        ollama_models = [m.get("model",m.get("name","?")) for m in result.get("models",[])]
        ollama_status = "online"
    except Exception:
        pass
    return {
        "ollama":        ollama_status,
        "ollama_models": ollama_models,
        "gemini":        "online" if api_key else "offline",
        "openai":        "online" if openai_api_key else "offline",
    }


# ── HEALTH ────────────────────────────────────────────────────────
@app.get("/")
@app.get("/health")
async def health():
    return {"status": "ok", "service": "SmartPM AI v2.0"}
