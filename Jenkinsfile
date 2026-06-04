pipeline {
    agent {
        kubernetes {
            yaml '''
            apiVersion: v1
            kind: Pod
            spec:
              containers:
              - name: docker
                image: docker:latest
                command:
                - cat
                tty: true
                volumeMounts:
                - mountPath: /var/run/docker.sock
                  name: docker-sock
              - name: kubectl
                image: dtzar/helm-kubectl:3.16.2
                command:
                - cat
                tty: true
              volumes:
              - name: docker-sock
                hostPath:
                  path: /var/run/docker.sock
            '''
        }
    }
    
    environment {
        // Here you would define your Docker Hub registry or AWS ECR. 
        // For local Minikube, we are just building to verify the Dockerfiles work.
        DOCKER_TAG = "latest"
    }

    stages {
        stage('Checkout Code') {
            steps {
                checkout scm
            }
        }

        stage('Build Backend Image') {
            steps {
                container('docker') {
                    echo "Building NestJS Backend..."
                    sh 'docker build -t smartpm-backend:${DOCKER_TAG} ./backend'
                }
            }
        }

        stage('Build Frontend Image') {
            steps {
                container('docker') {
                    echo "Building Angular Frontend..."
                    sh 'docker build -t smartpm-frontend:${DOCKER_TAG} ./frontend'
                }
            }
        }

        stage('Build AI Image') {
            steps {
                container('docker') {
                    echo "Building Python AI..."
                    sh 'docker build -t smartpm-ai:${DOCKER_TAG} ./ai'
                }
            }
        }

        stage('Deploy to Minikube') {
            steps {
                container('kubectl') {
                    echo "Applying Kubernetes Manifests..."
                    // In a real environment, you'd substitute image tags here
                    // and use a dedicated ServiceAccount. For local, we apply directly.
                    sh 'kubectl apply -f k8s/'
                }
            }
        }
    }
    
    post {
        success {
            echo "Pipeline completed successfully! Apps deployed."
        }
        failure {
            echo "Pipeline failed! Check the logs."
        }
    }
}
