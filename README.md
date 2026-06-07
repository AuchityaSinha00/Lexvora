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
