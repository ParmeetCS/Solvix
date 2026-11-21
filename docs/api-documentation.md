# SOLVIX API Documentation

## Base URLs (development)

- Frontend: `http://localhost:5173`
- Backend:  `http://localhost:3001`
- API prefix: `/api/v1`

## Response envelope

All API responses use a consistent JSON structure:

```json
{
  "success": true,
  "message": "ok",
  "data": null
}
```

Error responses:

```json
{
  "success": false,
  "message": "Request failed.",
  "error": "Human readable error message"
}
```

## Initial endpoints

### GET /api/health

Health check. Returns API status.

**Response (200):**
```json
{
  "success": true,
  "message": "SOLVIX API is running",
  "data": {
    "status": "healthy"
  }
}
```

### GET /api/v1

API name and version.

**Response (200):**
```json
{
  "success": true,
  "message": "SOLVIX API v1",
  "data": {
    "name": "SOLVIX API",
    "version": "1.0.0"
  }
}
```

## CORS

- The backend sends `Access-Control-Allow-Origin` headers on `/api/*`.
- During development, the frontend origin `http://localhost:5173` is allowed.
- Production: restrict to the configured frontend origin only (no wildcard).

## Authentication

- Auth is handled by Supabase Auth.
- The frontend stores the Supabase JWT in `localStorage` under `solvix_token`.
- The axios client attaches `Authorization: Bearer <token>` automatically.
- Backend route handlers verify the token via `lib/supabase/auth.js` and enforce
  authorization before accessing protected data.
- The service-role key is server-side only.

## Future endpoints (to be implemented)

REST resources planned under `/api/v1`:

- `/auth/*` — login, register, logout, profile
- `/customers`, `/leads`, `/quotations`, `/orders`
- `/site-surveys`, `/products`, `/inventory`
- `/installations`, `/technicians`
- `/warranties`, `/service-tickets`
- `/invoices`, `/expenses`, `/financial-transactions`
- `/documents`, `/subsidy-applications`
- `/notifications`, `/activity-logs`

Each resource will support standard REST operations with Zod request validation
and consistent error handling.

## Error handling

- 400: validation or bad request
- 401: unauthorized / invalid token
- 403: forbidden / insufficient permissions
- 404: resource not found
- 409: conflict (e.g. duplicate serial number)
- 429: too many requests
- 500: server error (no stack traces or secrets exposed)

Stack traces, environment variables, and internal secrets are never returned to the client.
