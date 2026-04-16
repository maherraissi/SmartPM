"""
SmartPM Database Seeder
=======================
Run with:
    cd ai
    .\\venv\\Scripts\\python.exe seed_db.py
"""

import asyncio
import os
import sys

# Force UTF-8 output on Windows
sys.stdout.reconfigure(encoding='utf-8')

from datetime import datetime, timedelta
from bson import ObjectId
import motor.motor_asyncio
import bcrypt

# ── Load env ─────────────────────────────────────────────────────
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

MONGO_URI = os.environ.get(
    "MONGODB_CLOUD_URI",
    "mongodb+srv://raissimaher:melek@cluster0.ihmh6wl.mongodb.net/smartpm?retryWrites=true&w=majority"
)

client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URI)
db = client["smartpm"]

# ── Helpers ───────────────────────────────────────────────────────
def oid():
    return ObjectId()

def hpw(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def days(n: int) -> datetime:
    return datetime.now() + timedelta(days=n)

def past(n: int) -> datetime:
    return datetime.now() - timedelta(days=n)

# ── DATA DEFINITIONS ─────────────────────────────────────────────

USERS = [
    # Managers
    {"_id": oid(), "firstName": "Maher",    "lastName": "Raissi",    "email": "manager@smartpm.com",    "role": "MANAGER", "certifications": ["HLR","LLR","CODE","LLT","HLT"], "isActive": True},
    {"_id": oid(), "firstName": "Salma",    "lastName": "Ben Ali",   "email": "salma.manager@smart.com","role": "MANAGER", "certifications": ["HLR","LLR","CODE"],            "isActive": True},
    # Members
    {"_id": oid(), "firstName": "Anis",     "lastName": "Trabelsi",  "email": "anis@smartpm.com",       "role": "MEMBER",  "certifications": ["LLR","CODE","LLT"],            "isActive": True},
    {"_id": oid(), "firstName": "Ines",     "lastName": "Chabchoub", "email": "ines@smartpm.com",       "role": "MEMBER",  "certifications": ["HLR","LLT","HLT"],             "isActive": True},
    {"_id": oid(), "firstName": "Yassine",  "lastName": "Ferchichi", "email": "yassine@smartpm.com",    "role": "MEMBER",  "certifications": ["LLR","CODE"],                  "isActive": True},
    {"_id": oid(), "firstName": "Rim",      "lastName": "Boujelben", "email": "rim@smartpm.com",        "role": "MEMBER",  "certifications": ["HLR","CODE","HLT"],            "isActive": True},
    {"_id": oid(), "firstName": "Omar",     "lastName": "Khlifi",    "email": "omar@smartpm.com",       "role": "MEMBER",  "certifications": ["LLT","HLT"],                   "isActive": True},
    {"_id": oid(), "firstName": "Hajer",    "lastName": "Mnasri",    "email": "hajer@smartpm.com",      "role": "MEMBER",  "certifications": ["LLR","CODE","LLT"],            "isActive": True},
    {"_id": oid(), "firstName": "Karim",    "lastName": "Oueslati",  "email": "karim@smartpm.com",      "role": "MEMBER",  "certifications": ["HLR","CODE"],                  "isActive": True},
    {"_id": oid(), "firstName": "Nour",     "lastName": "Agrebi",    "email": "nour@smartpm.com",       "role": "MEMBER",  "certifications": ["CODE","LLT","HLT"],            "isActive": True},
]

# Add password hash to all
for u in USERS:
    u["passwordHash"] = hpw("SmartPM2024!")
    u["provider"] = "local"
    u["createdAt"] = past(90)
    u["updatedAt"] = past(5)

MANAGER = USERS[0]
MEMBERS = USERS[2:]

def make_project(name, desc, status, start_delta, end_delta, member_ids, progress=0):
    return {
        "_id": oid(),
        "name": name,
        "description": desc,
        "managerId": MANAGER["_id"],
        "teamMembers": member_ids,
        "status": status,
        "startDate": past(start_delta),
        "targetStartDate": past(start_delta),
        "targetEndDate": days(end_delta),
        "progress": progress,
        "createdAt": past(start_delta),
        "updatedAt": past(2),
    }

PROJECTS = [
    make_project(
        "Navigation Display System",
        "Développement du système d'affichage navigation pour cockpit avionique. Interface critique pour le pilotage.",
        "ACTIVE", 60, 30, [MEMBERS[0]["_id"], MEMBERS[1]["_id"], MEMBERS[2]["_id"], MEMBERS[3]["_id"]], 45
    ),
    make_project(
        "Flight Control Software",
        "Logiciel de contrôle de vol - modèle de commandes de vol primaires. Module intégration capteurs inertiels.",
        "ACTIVE", 90, 60, [MEMBERS[1]["_id"], MEMBERS[2]["_id"], MEMBERS[4]["_id"]], 72
    ),
    make_project(
        "Engine Monitoring Module",
        "Système de surveillance moteur temps-réel avec alertes automatiques et journalisation des anomalies.",
        "PLANNING", 10, 180, [MEMBERS[3]["_id"], MEMBERS[5]["_id"], MEMBERS[6]["_id"]], 8
    ),
    make_project(
        "Emergency Systems Integration",
        "Intégration des systèmes d'urgence: oxygène, éjection, systèmes de secours hydrauliques.",
        "ON_HOLD", 30, 90, [MEMBERS[0]["_id"], MEMBERS[7]["_id"]], 15
    ),
    make_project(
        "Cabin Pressure Control",
        "Système de contrôle de pressurisation cabine. Module algorithmique de régulation automatique.",
        "COMPLETED", 200, -10, [MEMBERS[2]["_id"], MEMBERS[4]["_id"], MEMBERS[6]["_id"]], 100
    ),
]

# ── Activities per project ─────────────────────────────────────────
PHASES = [
    ("High Level Requirements", "HLR"),
    ("Low Level Requirements",  "LLR"),
    ("Implementation & Code",   "CODE"),
    ("Low Level Testing",       "LLT"),
    ("High Level Testing",      "HLT"),
]

SUB_CATEGORIES = ["Creation & Review", "Formal Review", "Technical Inspection"]

TASK_TITLES = {
    "HLR":  ["Définir les exigences système",   "Analyser les interfaces fonctionnelles",  "Valider les cas d'utilisation",          "Rédiger le SRS document",                "Revue formelle HLR"],
    "LLR":  ["Décomposer en requirements bas-niveau", "Définir interfaces logicielles",    "Vérifier la traçabilité HLR→LLR",        "Rédiger le SDD",                         "Revue technique LLR"],
    "CODE": ["Implémenter le module principal",  "Coder les algorithmes critiques",        "Réaliser la revue de code",              "Intégrer les sous-systèmes",             "Corriger les anomalies"],
    "LLT":  ["Créer les cas de test unitaires",  "Exécuter les tests de régression",       "Analyser couverture MC/DC",              "Documenter les résultats de test",       "Revue plan de test"],
    "HLT":  ["Définir plan de test système",     "Exécuter les tests d'intégration",       "Tester les scénarios de défaillance",    "Valider les exigences de haut niveau",   "Préparer le dossier de certification"],
}

STATUS_POOL = ["TODO", "IN_PROGRESS", "READY_FOR_REVIEW", "REVIEWED", "BLOCKED", "CLOSED"]

async def seed():
    print("=" * 60)
    print("  SmartPM Database Seeder v2.0")
    print("=" * 60)

    # ── 1. Clear old seed data (keep existing users if any) ─────
    print("\n🗑️  Clearing existing sample data...")
    await db.projects.delete_many({})
    await db.activities.delete_many({})
    await db.subactivities.delete_many({})
    await db.tasks.delete_many({})
    # Only clear users with our known emails
    seed_emails = [u["email"] for u in USERS]
    await db.users.delete_many({"email": {"$in": seed_emails}})
    print("   ✓ Old data cleared")

    # ── 2. Insert users ──────────────────────────────────────────
    print("\n👥 Inserting users...")
    await db.users.insert_many(USERS)
    print(f"   ✓ {len(USERS)} users created (2 managers + {len(MEMBERS)} members)")
    print(f"   📧 Login: manager@smartpm.com / SmartPM2024!")

    # ── 3. Insert projects ───────────────────────────────────────
    print("\n📁 Inserting projects...")
    await db.projects.insert_many(PROJECTS)
    print(f"   ✓ {len(PROJECTS)} projects created")

    # ── 4. Activities, SubActivities, Tasks per project ──────────
    total_tasks = 0
    for proj in PROJECTS:
        print(f"\n   📂 {proj['name']} ({proj['status']})")
        
        # How many phases to create depends on PROGRESS
        n_phases = 3 if proj["status"] in ["ACTIVE", "COMPLETED"] else 2
        if proj["status"] == "PLANNING":
            n_phases = 1

        for phase_idx in range(n_phases):
            phase_name, phase_code = PHASES[phase_idx]
            
            # Activity
            activity = {
                "_id": oid(),
                "projectId": proj["_id"],
                "projectName": proj["name"],
                "name": phase_name,
                "phase": phase_code,
                "progressPercentage": proj["progress"] if phase_idx < n_phases - 1 else max(0, proj["progress"] - 20),
                "createdAt": past(60 - phase_idx * 10),
                "updatedAt": past(5),
            }
            await db.activities.insert_one(activity)

            # 2 SubActivities per activity
            for cat_idx, category in enumerate(SUB_CATEGORIES[:2]):
                sub = {
                    "_id": oid(),
                    "activityId": activity["_id"],
                    "projectId": proj["_id"],
                    "projectName": proj["name"],
                    "category": category,
                    "progressPercentage": activity["progressPercentage"],
                    "attachedFiles": [],
                    "createdAt": past(55 - phase_idx * 10),
                    "updatedAt": past(3),
                }
                await db.subactivities.insert_one(sub)

                # 3 tasks per sub-activity
                titles = TASK_TITLES.get(phase_code, TASK_TITLES["CODE"])
                for t_idx in range(3):
                    title = titles[t_idx % len(titles)]
                    
                    # Assign author/reviewer from team (never same person)
                    author_idx  = (t_idx + cat_idx) % len(MEMBERS)
                    reviewer_idx = (t_idx + cat_idx + 1) % len(MEMBERS)
                    
                    # Determine realistic status based on project status
                    if proj["status"] == "COMPLETED":
                        t_status = "CLOSED"
                    elif proj["status"] == "PLANNING":
                        t_status = "TODO"
                    elif proj["status"] == "ON_HOLD":
                        t_status = "BLOCKED" if t_idx % 2 == 0 else "IN_PROGRESS"
                    else:
                        # ACTIVE: mix of statuses
                        t_status = STATUS_POOL[(phase_idx * 2 + t_idx) % (len(STATUS_POOL) - 1)]

                    est_hours = [8, 16, 24, 12, 32][t_idx % 5]
                    act_hours = int(est_hours * (proj["progress"] / 100.0 + 0.1))
                    
                    is_overdue = (proj["status"] == "ACTIVE" and t_idx == 2 and phase_idx == 0)
                    
                    task = {
                        "_id": oid(),
                        "title": f"{title} — {phase_name}",
                        "description": f"Tâche critique pour {proj['name']}. Phase: {phase_name}. Catégorie: {category}.",
                        "subActivityId": sub["_id"],
                        "authorId":   proj["teamMembers"][t_idx % len(proj["teamMembers"])] if proj["teamMembers"] else MEMBERS[0]["_id"],
                        "reviewerId": proj["teamMembers"][(t_idx + 1) % len(proj["teamMembers"])] if len(proj["teamMembers"]) > 1 else MEMBERS[1]["_id"],
                        "status": t_status,
                        "estimatedDuration": est_hours,
                        "actualDuration":    act_hours,
                        "plannedStartDate":  past(45 - phase_idx * 10 - t_idx * 3),
                        "plannedEndDate":    past(20 - phase_idx * 5)  if not is_overdue else past(5),
                        "actualStartDate":   past(40 - phase_idx * 10) if t_status not in ["TODO"] else None,
                        "actualEndDate":     past(10) if t_status in ["CLOSED", "REVIEWED"] else None,
                        "evidenceLinks":     [f"https://docs.smartpm.com/{proj['name'].replace(' ','-').lower()}/task-{t_idx}"] if t_status == "CLOSED" else [],
                        "idempotencyKey":    f"seed-{proj['_id']}-{phase_code}-{cat_idx}-{t_idx}",
                        "createdAt":         past(50 - phase_idx * 10),
                        "updatedAt":         past(1),
                    }
                    await db.tasks.insert_one(task)
                    total_tasks += 1

        print(f"      ✓ {n_phases} phases × 2 sub-activities × 3 tasks = {n_phases * 6} tasks")

    # ── 5. Summary ───────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("  ✅ SEED COMPLETE!")
    print("=" * 60)
    
    # Verify counts
    u_count = await db.users.count_documents({})
    p_count = await db.projects.count_documents({})
    a_count = await db.activities.count_documents({})
    s_count = await db.subactivities.count_documents({})
    t_count = await db.tasks.count_documents({})
    
    print(f"\n  Database Contents:")
    print(f"  👥 Users         : {u_count}")
    print(f"  📁 Projects      : {p_count}")
    print(f"  🔷 Activities    : {a_count}")
    print(f"  🔹 SubActivities : {s_count}")
    print(f"  📝 Tasks         : {t_count}")
    print(f"\n  Login credentials:")
    print(f"  📧 manager@smartpm.com       → MANAGER")
    print(f"  📧 anis@smartpm.com          → MEMBER")
    print(f"  🔑 Password: SmartPM2024!")
    print(f"\n  The simulator now has full DB context for all {p_count} projects!")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(seed())
