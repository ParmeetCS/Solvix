# SOLVIX Architecture

## Overview

SOLVIX — Solar Installation Management Platform is a full-stack application
with a React + Vite frontend and a separate Next.js backend, backed by Supabase
(PostgreSQL, Auth, Storage, Row Level Security).

## Repository layout

```
SOLVIX/
├── frontend/   (React + Vite, served from repo root src/)
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/      (CustomerLogin, EmployeeLogin, QuoteForm)
│   │   ├── pages/
│   │   │   ├── auth/        (RegisterCustomer, RegisterEmployee placeholders)
│   │   │   └── shared/      (NotFound placeholder)
│   │   ├── services/
│   │   │   └── api/         (centralized axios client)
│   │   ├── App.jsx          (React Router + landing page + routes)
│   │   ├── main.jsx
│   │   ├── index.css
│   │   └── App.css
│   ├── package.json
│   ├── tailwind.config.js   (preflight disabled — landing page untouched)
│   └── postcss.config.js
├── backend/                 (Next.js App Router, port 3001)
│   ├── app/
│   │   ├── api/health/route.js
│   │   └── api/v1/route.js
│   ├── lib/
│   │   ├── supabase/client.js
│   │   ├── supabase/auth.js
│   │   ├── validations/
│   │   └── utils/
│   ├── config/
│   ├── next.config.js
│   └── package.json
├── database/
│   └── solvix_complete_schema.sql   (single executable SQL file)
├── docs/
│   ├── architecture.md
│   └── api-documentation.md
├── .env.example             (VITE_API_BASE_URL)
├── .gitignore
├── package.json             (root — npm workspaces + concurrently)
└── README.md
```

> Note: The React frontend remains at the repository root (src/, public/) to
> preserve all existing files, imports, and the landing page implementation.
> The `frontend/` path in documentation refers to the root React app.

## Frontend responsibilities

- Render the existing landing page (unchanged).
- Render future department dashboards and shared pages.
- Manage client-side routing via React Router DOM.
- Call backend APIs through `src/services/api/client.js` (axios).
- Display loading, error, and success states.
- Tailwind CSS is available (preflight disabled) for new pages/dashboards only;
  the landing page keeps its original App.css styling.

## Backend responsibilities

- Next.js App Router Route Handlers (REST APIs).
- Business logic, input validation (Zod), database operations.
- Authorization checks (server-side) in addition to Supabase RLS.
- Communication with Supabase (service-role client for privileged ops;
  user-scoped client enforcing RLS).
- File-related operations.
- Runs on `http://localhost:3001`.

## Supabase integration

- **Auth:** identity source (`auth.users`). Passwords are never stored in app tables.
- **Database:** PostgreSQL schema in `database/solvix_complete_schema.sql`.
- **Storage:** available for document/photo upload paths (stored as text paths).
- **RLS:** enabled on all sensitive tables; policies enforce row-level access.
- **Service-role key:** server-side only, never exposed to frontend.

## Data flow

Frontend component → `apiClient` (axios, base URL from `VITE_API_BASE_URL`)
→ Next.js Route Handler → Supabase client → PostgreSQL.

Auth tokens are attached via request interceptor from `localStorage` (`solvix_token`).
Authorization is enforced both at the backend route level and Supabase RLS.

## Ports

- React + Vite: `http://localhost:5173`
- Next.js backend: `http://localhost:3001`

## Security principles

- Service-role key never committed or exposed to frontend.
- RLS enabled on sensitive tables; no unrestricted `USING (true)` policies.
- Users cannot self-grant admin or change approved department assignment.
- Financial/audit records use `restrict` (no cascade delete) to protect history.
