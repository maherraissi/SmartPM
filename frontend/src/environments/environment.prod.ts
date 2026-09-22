// Production environment - used in Docker/K8s builds
// apiUrl: relative URL, nginx proxies /api/* → backend service
// aiUrl: NodePort 30800 → FastAPI AI service
export const environment = {
  production: true,
  apiUrl: '',
  aiUrl: 'http://localhost:30800'
};
