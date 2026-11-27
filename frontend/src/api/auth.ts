import type { AuthState } from '../context/auth'
import { apiRequest, setToken } from './http'
import { mapAuthState } from './types'
import type { BackendAuthResponse, BackendAuthState } from './types'

export async function login(email: string, password: string): Promise<AuthState> {
  const response = await apiRequest<BackendAuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  setToken(response.token)
  return mapAuthState(response)
}

export async function signup(
  name: string,
  email: string,
  password: string,
): Promise<AuthState> {
  const response = await apiRequest<BackendAuthResponse>('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  })
  setToken(response.token)
  return mapAuthState(response)
}

export async function getMe(): Promise<AuthState> {
  const payload = await apiRequest<BackendAuthState>('/api/auth/me')
  return mapAuthState(payload)
}

export async function logout(): Promise<void> {
  try {
    await apiRequest('/api/auth/logout', { method: 'POST' })
  } finally {
    setToken(null)
  }
}