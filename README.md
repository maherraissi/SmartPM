# 🚀 SmartPM - Smart Aerospace Engineering Execution & Competency Platform

Plateforme d'exécution d'ingénierie conforme aux normes . 
Conçue par [Maher Raissi](https://github.com/maherraissi/SmartPM).

## 🧰 Environnement Technique & Versions

- **OS** : Windows / Linux
- **Backend** : NestJS (Node.js `v20.19.0`, npm `11.6.4`)
- **Frontend** : Angular CLI (`v21.2.6`), Standalone Components, Vanilla CSS
- **Base de Données** : MongoDB (Dual mode : Local ou Atlas M0 Cluster)
- **AI Service** : Python (`v3.13.7`), FastAPI, ChromaDB (Langchain Vector DB), Ollama (`v0.19.0` avec `llama3`), Gemini 1.5 Pro.

---

## 🛠️ Installation du projet

```powershell
# 1. Cloner le projet (si vous n'avez pas le code source)
git clone https://github.com/maherraissi/SmartPM.git
cd SmartPM

# 2. Installer TOUTES les dépendances du projet (Backend, Frontend, AI Vector DB)
npm run install:all
```

## ☁️ Configuration & .env (Très Important)
Le projet contient un Backend NestJS et un service Python AI. Chacun a son `dotenv`.

👉 **Backend (`backend/.env`)**
```env
# Database Mode
DB_ENV=cloud

# Connetion Strings
MONGODB_LOCAL_URI=mongodb://localhost:27017/smartpm
MONGODB_CLOUD_URI=mongodb+srv://raissimaher:melek@cluster0.ihmh6wl.mongodb.net/smartpm?retryWrites=true&w=majority

JWT_SECRET=super-secret-key-aerospace-99
```

👉 **AI Service (`ai/.env`)**
```env
GEMINI_API_KEY=votre_clé_google_ai_studio
OLLAMA_BASE_URL=http://localhost:11434
PORT=8000
```

---

## 🚀 Lancement (Run)
L'intelligence de la plateforme permet de tout allumer de façon concurrente.

```powershell
# Démarre le backend BDD, le Frontend Serveur et l'API Python simultanément
npm run dev
```

Dès le démarrage de cet éco-système, le Backend va interroger MongoDB Atlas et **créera automatiquement** toutes les tables de la DB (`smartpm : users, projects, tasks, functiontemplates...`).

---

## 🧠 L'Écosystème Intelligence Artificielle (RAG + Agents)
Le dossier `/ai` contient un service local FastAPI muni de **ChromaDB**.
L'avantage de cette Vector Database embarquée est d'offrir une sécurisation totale (Data Privacy) très prisée dans le milieu Aéronautique. ChromaDB ingère vos manuels et guidelines internes. Ensuite, les 3 Agents collaborent :
1. **Project Agent (Gemini)** : Split des tâches (LLR, LLT) optimal (Auto-planning 8->12h).
2. **Review Agent (Ollama Local)** : Analyse anti-conflits d'intérêt (Author vs Reviewer).
3. **Training Agent** : Coach du "Competency Center" mesurant les aptitudes.
