import { backendConnected } from '../config'
import { readDemoState, toAuthState, updateDemoState } from '../data/demoState'
import type { AuthState } from '../context/auth'
import { apiRequest, setToken } from './http'
import { mapAuthState } from './types'
import type { BackendAuthResponse, BackendAuthState } from './types'

const DEMO_TOKEN = 'demo-session'

export async function login(email: string, password: string): Promise<AuthState> {
  if (!backendConnected) {
    const next = updateDemoState((current) => ({ ...current, signedOut: false }))
    setToken(DEMO_TOKEN)
    return toAuthState(next)
  }

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
  if (!backendConnected) {
    const next = updateDemoState((current) => {
      const member = {
        id: `demo-${Date.now()}`,
        name,
        email,
        role: 'member' as const,
      }

      return {
        ...current,
        signedOut: false,
        user: { id: member.id, name: member.name, email: member.email },
        role: current.organization ? 'member' : null,
        members: current.organization ? [...current.members, member] : current.members,
      }
    })
    setToken(DEMO_TOKEN)
    return toAuthState(next)
  }

  const response = await apiRequest<BackendAuthResponse>('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  })
  setToken(response.token)
  return mapAuthState(response)
}

export async function getMe(): Promise<AuthState> {
  if (!backendConnected) {
    return toAuthState(readDemoState())
  }

  const payload = await apiRequest<BackendAuthState>('/api/auth/me')
  return mapAuthState(payload)
}

export async function logout(): Promise<void> {
  if (!backendConnected) {
    updateDemoState((current) => ({ ...current, signedOut: true }))
    setToken(null)
    return
  }

  try {
    await apiRequest('/api/auth/logout', { method: 'POST' })
  } finally {
    setToken(null)
  }
}
