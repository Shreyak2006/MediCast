/**
 * Single switch for the frontend/backend connection.
 *
 * Standalone mode (the default) keeps every page working from local demo data,
 * so the frontend can be installed and run on its own. Set
 * VITE_BACKEND_CONNECTED=true in frontend/.env to send auth, organization,
 * admin and inventory traffic to the FastAPI backend again.
 *
 * The Calculator is intentionally different: it always tries the backend first
 * and falls back to a local estimate when the backend cannot be reached. See
 * README.md for the full reconnection checklist.
 */
export const backendConnected =
  import.meta.env.VITE_BACKEND_CONNECTED === 'true'

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'
).replace(/\/+$/, '')
