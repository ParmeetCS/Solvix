// Small typed error used by quotation/order APIs so route handlers can return
// consistent HTTP status codes without leaking stack traces.
export class ApiError extends Error {
  constructor(message, status = 400, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export function asApiError(error, fallbackMessage = 'Request failed.', fallbackStatus = 500) {
  if (error instanceof ApiError) return error;
  const message = error?.message || fallbackMessage;
  return new ApiError(message, fallbackStatus);
}

export default ApiError;
