# Confera

[![Frontend CI/CD](https://github.com/nikop36/confera/actions/workflows/frontend.yml/badge.svg)](https://github.com/nikop36/confera/actions/workflows/frontend.yml)
[![Backend CI/CD](https://github.com/nikop36/confera/actions/workflows/backend.yml/badge.svg)](https://github.com/nikop36/confera/actions/workflows/backend.yml)

Confera is a conference networking platform for participant profiles, interest-based matching, meeting scheduling, research fair management, and career interviews.

## CI/CD

The repository has separate GitHub Actions workflows for the frontend and backend:

- Frontend: installs dependencies, runs linting, runs unit tests when a test script exists, builds the Next.js app, and deploys to Vercel on pushes to `main`.
- Backend: installs dependencies, runs linting, runs Jest unit tests with coverage, builds the NestJS app, runs SonarQube Cloud analysis, and triggers a Render deploy hook on pushes to `main`.

## Required GitHub Secrets

Frontend deployment:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

Backend quality and deployment:

- `SONAR_TOKEN`
- `SONAR_PROJECT_KEY`
- `SONAR_ORGANIZATION`
- `RENDER_DEPLOY_HOOK_URL`

CI jobs run on pull requests even when deployment secrets are not configured. Deployment and SonarQube steps are skipped until the relevant secrets are added.
