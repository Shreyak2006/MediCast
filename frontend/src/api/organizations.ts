import type { AuthState, CreateOrganizationInput } from '../context/auth'
import { getMe } from './auth'
import { apiRequest } from './http'
import { mapAuthState } from './types'
import type { BackendAuthState } from './types'

export async function createOrganization(
  input: CreateOrganizationInput,
): Promise<AuthState> {
  await apiRequest('/api/organizations', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return getMe()
}

export async function joinOrganization(code: string): Promise<AuthState> {
  const payload = await apiRequest<BackendAuthState>('/api/organizations/join', {
    method: 'POST',
    body: JSON.stringify({ code }),
  })
  return mapAuthState(payload)
}

export async function leaveOrganization(): Promise<AuthState> {
  const payload = await apiRequest<BackendAuthState>(
    '/api/organizations/me/leave',
    { method: 'POST' },
  )
  return mapAuthState(payload)
}

export async function removeMember(memberId: string): Promise<void> {
  await apiRequest(`/api/admin/members/${memberId}`, { method: 'DELETE' })
}
