# SOLVIX — Solar Installation Management Platform

Full-stack foundation for a solar installation management platform (hackathon).

## Tech stack

**Frontend** (React + Vite, repo root)
- React.js, Vite, JavaScript
- React Router DOM (client-side routing)
- Tailwind CSS (preflight disabled — landing page untouched)
- Lucide React, Recharts, Axios

**Backend** (`backend/`)
- Next.js 15 App Router (Route Handlers), port 3001
- Zod (validation), Supabase JS SDK

**Database & Cloud**
- Supabase PostgreSQL, Auth, Storage, Row Level Security

## Repository layout

```
SOLVIX/
├── src/              (React frontend — landing page preserved)
├── public/
├── backend/          (Next.js API)
├── database/
│   └── solvix_complete_schema.sql   (single executable SQL file)
├── docs/
│   ├── architecture.md
│   └── api-documentation.md
├── .env.example
├── package.json      (root — npm workspaces + concurrently)
└── README.md
```

## Environment setup

1. Copy `backend/.env.example` → `backend/.env.local` and fill in Supabase
   credentials (`SUPABASE_URL`, `SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`).
2. Copy `.env.example` → `.env` at root (frontend) if you want to override
   `VITE_API_BASE_URL` (default `http://localhost:3001/api/v1`).
3. Never commit `.env` or `.env.local` — they are gitignored.

## Database (mandatory, one-time)

Execute `database/solvix_complete_schema.sql` once in the Supabase SQL Editor
against a **fresh** project. See `database/README.md` for full instructions and
the secure first-Admin bootstrap procedure.

## Commands

From the repository root:

```
npm install                 # installs frontend + backend (workspace) deps
npm run dev                 # starts frontend (5173) + backend (3001)
npm run build               # builds frontend + backend
npm run lint                # lints frontend + backend
```

Endpoints:
- Frontend: http://localhost:5173
- Backend health: http://localhost:3001/api/health
- Backend version: http://localhost:3001/api/v1

## Routes

- `/` — Landing page (existing, unchanged)
- `/login/customer` — Customer login
- `/login/employee` — Employee login
- `/register/customer` — Customer registration (placeholder)
- `/register/employee` — Employee registration (placeholder)
- `/get-quote` — Quote form

## Notes

- The landing page (src/App.jsx UI, App.css, index.css reset) is intentionally
  left unchanged. Tailwind preflight is disabled so new pages/dashboards can use
  Tailwind without affecting the landing page.
- Backend runs independently on port 3001 with CORS configured for the frontend
  origin.
- Do not build complete business dashboards in this foundation task — the
  database schema and technical setup are ready for future modules.
