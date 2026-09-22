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

groq_api_key = os.environ.get("GROQ_API_KEY", "")
groq_client = AsyncOpenAI(api_key=groq_api_key, base_url="https://api.groq.com/openai/v1") if groq_api_key else None

or_api_key = os.environ.get("OPENROUTER_API_KEY", "")
or_client = AsyncOpenAI(api_key=or_api_key, base_url="https://openrouter.ai/api/v1") if or_api_key else None

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

from prometheus_fastapi_instrumentator import Instrumentator
Instrumentator().instrument(app).expose(app)

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
        projects = await db.projects.find({}, {"name":1,"status":1,"progress":1}).to_list(10)
        users    = await db.users.find({}, {"firstName":1,"lastName":1,"role":1}).to_list(15)
        proj_str = ", ".join([f"{p.get('name','?')}({p.get('status','?')} {p.get('progress',0)}%)" for p in projects]) or "Aucun projet"
        user_str = ", ".join([f"{u.get('firstName','')} {u.get('lastName','')}[{u.get('role','?')}]" for u in users]) or "Aucun"
        db_context_str = f"Projets: {proj_str} | Equipe: {user_str}"
    except Exception as e:
        db_context_str = f"BD: {str(e)[:80]}"

    system = (
        "Tu es SmartPM AI, assistant concis en gestion de projet. "
        "Reponds en 2-4 phrases max, sois direct et precis. "
        f"Donnees live: {db_context_str}"
    )
    if request.context:
        system += f" | Contexte: {request.context[:200]}"

    recent = (request.history or [])[-3:]
    messages = [{"role": "system", "content": system}]
    for m in recent:
        messages.append({"role": m.role, "content": m.content})
    messages.append({"role": "user", "content": request.message})

    async def stream_generator():
        yield " "  # Immediate first byte

        # PRIMARY: Groq (fastest - ~300ms TTFT)
        if groq_client:
            try:
                stream = await groq_client.chat.completions.create(
                    model="llama3-8b-8192",
                    messages=messages,
                    stream=True,
                    temperature=0.3,
                    max_tokens=400
                )
                async for chunk in stream:
                    content = chunk.choices[0].delta.content
                    if content: yield content
                return
            except Exception as e_groq:
                print(f"[CHAT] Groq error: {e_groq}")

        # FALLBACK 1: Gemini Flash
        try:
            prompt = f"{system}\nUser: {request.message}\nAssistant:"
            generation_config = genai.types.GenerationConfig(temperature=0.3, top_p=0.8, max_output_tokens=400)
            response = await gemini_model.generate_content_async(prompt, generation_config=generation_config, stream=True)
            async for chunk in response:
                if chunk.text: yield chunk.text
            return
        except Exception as e_gemini:
            print(f"[CHAT] Gemini error: {e_gemini}")

        # FALLBACK 2: OpenRouter
        if or_client:
            try:
                stream = await or_client.chat.completions.create(
                    model="meta-llama/llama-3.1-8b-instruct:free",
                    messages=messages, stream=True, temperature=0.3, max_tokens=400
                )
                async for chunk in stream:
                    content = chunk.choices[0].delta.content
                    if content: yield content
                return
            except Exception as e_or:
                print(f"[CHAT] OpenRouter error: {e_or}")

        yield "⚠️ Service IA temporairement indisponible. Reessayez."

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

    prompt = f"""Tu es SmartPM Simulator — expert senior en gestion de projets critiques (avionique, spatial, automobile, défense).{warning_str}

=================================================================
📊 DONNÉES RÉELLES DU PROJET — SmartPM MongoDB Live
=================================================================
**Projet**         : {project_info['name']}
**Description**    : {project_info['description']}
**Statut actuel**  : {project_info['status']}
**Avancement**     : {project_info['progress']}%
**Date début**     : {project_info['startDate']}
**Date fin prév.** : {project_info['endDate']}

**Équipe ({len(team_info)} membres) :**
{team_str}

**Statistiques Tâches ({task_stats['total']} tâches) :**
  - Par statut           : {status_str}
  - Tâches en retard     : {overdue_str}
  - Heures estimées      : {task_stats.get('total_estimated_hours',0)}h
  - Heures réelles       : {task_stats.get('total_actual_hours',0)}h
  - Ratio d'efficacité   : {task_stats.get('efficiency_ratio',1.0)}

**Phases & Activités :**
{act_str}

=================================================================
🎯 DEMANDE UTILISATEUR
=================================================================
Scénario     : {request.scenario}
Horizon      : {request.duration_weeks} semaines
Variables    : {json.dumps(request.variables or {}, ensure_ascii=False)}

=================================================================
📋 FORMAT DE RAPPORT ATTENDU (OBLIGATOIRE)
=================================================================
Génère un rapport complet et professionnel en Markdown structuré.
Le rapport DOIT impérativement contenir ces sections dans cet ordre :

# 🔍 Rapport d'Analyse Prédictive — [Nom du projet]

## 1. 📊 Tableau de Bord Exécutif
Génère un tableau Markdown avec les KPIs clés :
| Indicateur | Valeur | Tendance | Statut |
(Score de risque /100, Probabilité de livraison à temps %, Indice de confiance %, Tâches critiques, etc.)

## 2. ⚠️ Analyse des Risques Identifiés
Liste détaillée de 4 à 6 risques majeurs. Pour chaque risque :
- **Risque** : [description précise]
- **Probabilité** : [Faible/Moyen/Élevé/Critique]
- **Impact** : [description de l'impact]
- **Mitigation** : [action concrète recommandée]

## 3. ⚡ Chemin Critique et Goulots d'Étranglement
Analyse du chemin critique avec les tâches/phases bloquantes.
Indique les dépendances et les délais associés.

## 4. 👥 Analyse de la Charge d'Équipe
Évalue l'utilisation des ressources pour chaque membre de l'équipe.
Identifie les surcharges et sous-utilisations.

## 5. 💡 Recommandations Prioritaires
Minimum 5 recommandations concrètes et actionnables, triées par priorité :
1. **[Priorité CRITIQUE]** — Description détaillée de l'action
2. **[Priorité HAUTE]** — ...
...

## 6. 📅 Plan d'Action sur {request.duration_weeks} Semaines
Tableau de bord hebdomadaire avec les jalons et livrables :
| Semaine | Objectif | Responsable | Critère de succès |

## 7. 🔮 Prévisions et Scénarios
- **Scénario Optimiste** : conditions + date de livraison prévue
- **Scénario Nominal** : conditions + date de livraison prévue
- **Scénario Pessimiste** : conditions + date de livraison prévue

## 8. ✅ Conclusion et Score Final
Score de risque global et recommandation de décision (GO / NO-GO / CONDITIONNEL).

---
*Rapport généré par SmartPM AI Simulator · Gemini 2.5 Flash · Données MongoDB Live*
"""

    model_name = request.model_name or "llama3"

    if model_name == "agent_2" or model_name.lower().startswith("gemini"):
        async def gemini_stream():
            import asyncio
            system_instruction = (
                "Tu es un expert senior en gestion de projets logiciels critiques (avionique, spatial, automobile). "
                "Tu parles exclusivement francais. Tes rapports sont structures, precis et directement actionnables. "
                "Tu utilises les donnees reelles du projet pour personaliser chaque section de ton analyse."
            )
            full_prompt = system_instruction + "\n\n" + prompt
            generation_config = genai.types.GenerationConfig(temperature=0.25)

            # ── Try Gemini first ──────────────────────────────────
            try:
                response = await gemini_model.generate_content_async(
                    full_prompt, generation_config=generation_config, stream=True
                )
                async for chunk in response:
                    if chunk.text:
                        yield chunk.text
                return  # Success

            except Exception as e_gemini:
                err_str = str(e_gemini)
                is_quota = "429" in err_str or "quota" in err_str.lower() or "RESOURCE_EXHAUSTED" in err_str

                if is_quota and groq_client:
                    # ── Auto-fallback to Groq ─────────────────────
                    print(f"[SIMULATE] Gemini quota exceeded → switching to Groq")
                    try:
                        stream = await groq_client.chat.completions.create(
                            model="llama-3.1-8b-instant",
                            messages=[
                                {"role": "system", "content": system_instruction},
                                {"role": "user",   "content": prompt}
                            ],
                            stream=True,
                            temperature=0.25,
                            max_tokens=3000,
                        )
                        async for chunk in stream:
                            content = chunk.choices[0].delta.content or ""
                            if content:
                                yield content
                        return  # Success via Groq

                    except Exception as e_groq:
                        yield f"\n\n**Erreur Simulation** : Gemini quota dépassé et Groq indisponible.\n\nErreur Groq: {str(e_groq)}"
                        return

                elif "503" in err_str and groq_client:
                    # ── Gemini overloaded → Groq fallback ─────────
                    print(f"[SIMULATE] Gemini 503 → switching to Groq")
                    try:
                        stream = await groq_client.chat.completions.create(
                            model="llama-3.1-8b-instant",
                            messages=[
                                {"role": "system", "content": system_instruction},
                                {"role": "user",   "content": prompt}
                            ],
                            stream=True,
                            temperature=0.25,
                            max_tokens=3000,
                        )
                        async for chunk in stream:
                            content = chunk.choices[0].delta.content or ""
                            if content:
                                yield content
                        return

                    except Exception as e_groq2:
                        yield f"\n\n**Erreur** : Gemini surchargé et Groq indisponible.\n\nErreur: {str(e_groq2)}"
                        return
                else:
                    yield f"\n\n**Erreur Gemini Simulation** : {err_str}\n\n_Veuillez réessayer dans quelques instants._"
                    return

        return StreamingResponse(gemini_stream(), media_type="text/plain")

    else:
        async def ollama_stream():
            try:
                actual_model = "llama3" if model_name == "agent_1" else model_name
                stream = ollama.chat(
                    model=actual_model,
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
        if api_key:
            models.insert(0, "Gemini-2.5-Flash")
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
