# Claude Code - Project Guidelines

## Project Overview

52-Patta is a monorepo with a Node.js/Express backend and a React frontend client, both containerized with Docker and deployed to EC2 via GitHub Actions.

## Repository Structure

```
/
├── server.js          # Express server entry point
├── Dockerfile         # Server Docker image
├── client/            # React frontend
│   └── Dockerfile     # Client Docker image
└── .github/workflows/
    ├── ec2-server.yml # Server CI/CD pipeline
    ├── ec2-client.yml # Client CI/CD pipeline
    └── claude.yml     # Claude Code GitHub Actions
```

## Code Standards

- Follow existing patterns in the codebase
- Keep server code in the root; client code under `client/`
- Do not commit `.env` files or secrets

## Docker & Deployment

- Server image: `prins203/52-patta-server` (port 4000)
- Client image: `prins203/52-patta-client` (port 3000)
- Self-hosted runners are labeled `server` and `client` respectively
- Changes to `client/**` trigger the client workflow; all other changes trigger the server workflow

## Secrets Required

- `ANTHROPIC_API_KEY` — for Claude Code GitHub Actions
- `DOCKER_USERNAME` / `DOCKER_PASSWORD` — Docker Hub credentials
- `MONGO_DB_NAME`, `MONGO_USERNAME`, `MONGO_PASSWORD`, `MONGO_HOST` — MongoDB config
- `JWT_SECRET` — authentication secret
- `REACT_APP_WS_URL` — WebSocket URL for the client
