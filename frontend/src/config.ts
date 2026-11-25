/**
 * Base URL of the FastAPI backend. Override with VITE_API_BASE_URL in
 * frontend/.env when the backend is not running on the default local address.
 */
export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'
).replace(/\/+$/, '')