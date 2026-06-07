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

Each file contains AWS ECS/ECR names, app environment, region, support email, and demo credentials. Replace production demo passwords with AWS SSM Parameter Store or another secret manager before going live.

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
