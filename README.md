# ObsFly Monorepo

This is a monorepo for the ObsFly observability platform, containing a Next.js frontend and a Golang backend, backed by ClickHouse.

## Structure

- `apps/frontend`: Next.js application (Dashboard).
- `apps/backend`: Golang application (API & Data Generator).
- `deploy`: Deployment configurations.
    - `docker-compose.yml`: Local development setup.
    - `k8s`: Kubernetes manifests.

## Prerequisites

- Docker & Docker Compose
- Go 1.21+
- Node.js 18+

## Getting Started (Local Development)

1.  **Start the infrastructure:**
    ```bash
    cd deploy
    docker-compose up --build
    ```

2.  **Access the applications:**
    - Frontend: [http://localhost:3000](http://localhost:3000)
    - Backend API: [http://localhost:8080/api/logs](http://localhost:8080/api/logs)
    - ClickHouse: [http://localhost:8123](http://localhost:8123)

## Deployment (Kubernetes)

1.  **Build images:**
    ```bash
    docker build -t backend:latest apps/backend
    docker build -t frontend:latest apps/frontend
    ```

2.  **Apply manifests:**
    ```bash
    kubectl apply -f deploy/k8s/
    ```

## Features

- **Real-time Logs**: The backend generates dummy log data and stores it in ClickHouse.
- **Dashboard**: The frontend polls the backend API to display the latest logs.
- **Monorepo**: Unified structure for easy management.
