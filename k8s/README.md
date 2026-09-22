# SmartPM Kubernetes & Monitoring (DevOps)

Ce dossier contient toute l'infrastructure as code (Kubernetes) nécessaire pour déployer l'application complète, avec ses pods et le système de monitoring.

## 1. Construire les images Docker

Avant de lancer Kubernetes, vous devez construire les images Docker de vos 3 services (à lancer depuis la racine du projet) :

```bash
docker build -t smartpm-frontend:latest ./frontend
docker build -t smartpm-backend:latest ./backend
docker build -t smartpm-ai:latest ./ai
```

*(Si vous utilisez Minikube, n'oubliez pas de taper `eval $(minikube docker-env)` avant de builder).*

## 2. Déployer l'application (Les Pods)

Appliquez les configurations Kubernetes dans l'ordre suivant :

```bash
kubectl apply -f k8s/mongo.yaml
kubectl apply -f k8s/backend.yaml
kubectl apply -f k8s/ai.yaml
kubectl apply -f k8s/frontend.yaml
```

Les Pods vont maintenant se lancer et communiquer entre eux grâce aux `Services` Kubernetes.

## 3. Déployer le Monitoring (Prometheus & Grafana)

Pour surveiller l'état de l'application et l'utilisation CPU/RAM :

```bash
kubectl apply -f k8s/prometheus.yaml
kubectl apply -f k8s/grafana.yaml
```

## 4. Accéder à l'application

Si vous utilisez Docker Desktop (avec K8s activé) ou Minikube :
- **Frontend (SmartPM)** : http://localhost:30080 
- **Prometheus** : http://localhost:30090
- **Grafana** : http://localhost:30091

*(Note: Sur Grafana, les identifiants par défaut sont `admin` / `admin`. Vous pourrez ensuite ajouter Prometheus comme "Data Source" en mettant l'URL `http://prometheus:9090`).*
