# LexVora Mock API App

LexVora prototype with a Node-based mock API for customer login, admin login, lawyer signup, lawyer search, consultation requests, demo payment, admin approval/rejection, demo SMS messaging, and refund simulation.

## Run Locally

```bash
npm start
```

Then open:

```text
http://localhost:8080
```

Run a specific environment:

```bash
npm run start:dev
npm run start:test
npm run start:prod
```

## Demo Credentials

Customer:
`customer@lexvora.in`
`Customer@123`

Admin:
`admin@lexvora.in`
`Admin@123`

## Mock API Routes

- `POST /api/login`
- `GET /api/lawyers`
- `POST /api/lawyers`
- `GET /api/lawyers/search`
- `GET /api/requests`
- `POST /api/requests`
- `POST /api/requests/:id/approve`
- `POST /api/requests/:id/reject`
- `POST /api/contact`

GitHub Pages cannot run this API because it only serves static files. Deploy this app on a Node-capable host such as Render, Railway, Fly.io, Vercel server functions, or a VPS.

## Environments

Environment files live in `config/`:

- `config/dev.env`
- `config/test.env`
- `config/prod.env`

Each file contains AWS ECS/ECR names, app environment, region, support email, database mode, and demo credentials. Replace production demo passwords and `DATABASE_URL` with AWS SSM Parameter Store or another secret manager before going live.

## Database Setup

The app now uses a repository layer in `db.mjs`.

Supported database modes:

- `DB_CLIENT=memory`: local mock storage for dev/test demos
- `DB_CLIENT=postgres`: production-ready PostgreSQL connectivity

PostgreSQL schema:

```bash
psql "$DATABASE_URL" -f db/schema.sql
```

Production environment variables:

```text
DB_CLIENT=postgres
DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/DB_NAME
DB_SSL=true
DB_POOL_MAX=10
```

For AWS ECS, the provided task-definition template expects this SSM parameter:

```text
/lexvora/<env>/database_url
```

The database adapter is intentionally isolated from route handlers, so a future move to RDS, Aurora PostgreSQL, or another persistent database only needs repository-level changes.

## AWS + Jenkins

This repo includes:

- `Dockerfile` for container builds
- `aws/ecs-task-definition.template.json` for AWS ECS Fargate
- `Jenkinsfile` for build, ECR push, and ECS deploy

Jenkins expected credentials:

- `aws-jenkins-credentials`: AWS access key credential with ECR/ECS permissions
- `aws-account-id`: secret text containing the AWS account ID

Jenkins parameter:

- `TARGET_ENV`: `dev`, `test`, or `prod`
- `DEPLOY`: build-only when false, build and deploy when true

AWS resources expected per environment:

- ECR repository, created automatically if missing
- ECS cluster
- ECS service
- `ecsTaskExecutionRole`
- CloudWatch log group `/ecs/lexvora/<env>`
- SSM parameters for production secrets if using the provided task template
- RDS/Aurora PostgreSQL database with `db/schema.sql` applied when `DB_CLIENT=postgres`
