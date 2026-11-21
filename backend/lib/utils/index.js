// Shared backend utilities.
//
// Standardized JSON response envelope used by all route handlers:
//   { success: boolean, message: string, data?: any, error?: string }
export function jsonResponse(data, options = {}) {
  const { status = 200, message = 'ok', headers = {} } = options;
  const body = { success: true, message, data };
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

export function jsonError(message, status = 400, data) {
  const body = { success: false, message: message || 'Request failed.', error: message, data };
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function corsHeaders(origin = '*') {
  // In production, replace '*' with the configured frontend origin only.
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };
}

export function handleOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export default { jsonResponse, jsonError, corsHeaders, handleOptions };
