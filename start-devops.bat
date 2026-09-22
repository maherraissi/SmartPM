@echo off
echo =========================================
echo       SmartPM CI/CD Local Pipeline
echo =========================================
echo.

echo [1/4] Building Frontend Docker Image...
docker build -t smartpm-frontend:latest ./frontend
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Frontend build failed!
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [2/4] Building Backend Docker Image...
docker build -t smartpm-backend:latest ./backend
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Backend build failed!
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [3/4] Building AI Docker Image...
docker build -t smartpm-ai:latest ./ai
if %ERRORLEVEL% neq 0 (
    echo [ERROR] AI build failed!
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [4/4] Applying Kubernetes Manifests...
kubectl apply -f ./k8s
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to apply Kubernetes manifests!
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo =========================================
echo   Deployment completed successfully!
echo =========================================
echo You can check the status of your pods using:
echo kubectl get pods
echo.
pause
