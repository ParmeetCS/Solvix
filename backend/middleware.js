// CORS for the SOLVIX API. The React app (Vite, :5173) calls this backend
// (Next.js, :3001) from another origin, and every response - not only the
// preflight - must carry the CORS headers or the browser discards it, which
// surfaces in the UI as a generic "unexpected error".
import { NextResponse } from 'next/server';

function allowedOrigins() {
  const configured = (process.env.FRONTEND_ORIGIN || '')
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, '')) // a trailing "/" never matches the browser's Origin header
    .filter(Boolean);
  return configured.length
    ? configured
    : ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:4173'];
}

function corsHeaders(origin) {
  const headers = {
    Vary: 'Origin',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
  if (origin && allowedOrigins().includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

export function middleware(request) {
  const origin = request.headers.get('origin');
  const headers = corsHeaders(origin);

  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers });
  }

  const response = NextResponse.next();
  Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
  // API responses carry user data and must never be cached.
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

export const config = { matcher: '/api/:path*' };
