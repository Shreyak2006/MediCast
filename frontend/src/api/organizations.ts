import { backendConnected } from '../config'
import { toAuthState, updateDemoState } from '../data/demoState'
import type { AuthState, CreateOrganizationInput } from '../context/auth'
import { getMe } from './auth'
import { apiRequest } from './http'
import { mapAuthState } from './types'
import type { BackendAuthState } from './types'

function demoCode() {
  const suffix = Math.random().toString(36).slice(2, 7).toUpperCase()
  return `DEMO-${suffix}`
}

export async function createOrganization(
  input: CreateOrganizationInput,
): Promise<AuthState> {
  if (!backendConnected) {
    return toAuthState(
      updateDemoState((current) => ({
        ...current,
        organization: {
          id: `demo-org-${Date.now()}`,
          name: input.name,
          code: demoCode(),
          state: input.state,
          district: input.district,
          pincode: input.pincode,
          hospital_type: input.hospital_type,
        },
        role: 'admin',
        pendingJoinCode: null,
        members: current.members.some(
          (member) => member.id === current.user.id,
        )
          ? current.members.map((member) =>
              member.id === current.user.id
                ? { ...member, role: 'admin' as const }
                : member,
            )
          : [...current.members, { ...current.user, role: 'admin' as const }],
        pendingRequests: [],
      })),
    )
  }

  await apiRequest('/api/organizations', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return getMe()
}

export async function joinOrganization(code: string): Promise<AuthState> {
  if (!backendConnected) {
    return toAuthState(
      updateDemoState((current) => ({
        ...current,
        pendingJoinCode: code.trim().toUpperCase(),
      })),
    )
  }

  const payload = await apiRequest<BackendAuthState>('/api/organizations/join', {
    method: 'POST',
    body: JSON.stringify({ code }),
  })
  return mapAuthState(payload)
}

export async function leaveOrganization(): Promise<AuthState> {
  if (!backendConnected) {
    return toAuthState(
      updateDemoState((current) => ({
        ...current,
        organization: null,
        role: null,
        members: [],
        pendingJoinCode: null,
      })),
    )
  }

  const payload = await apiRequest<BackendAuthState>(
    '/api/organizations/me/leave',
    { method: 'POST' },
  )
  return mapAuthState(payload)
}

export async function removeMember(memberId: string): Promise<void> {
  if (!backendConnected) {
    updateDemoState((current) => ({
      ...current,
      members: current.members.filter((member) => member.id !== memberId),
    }))
    return
  }

  await apiRequest(`/api/admin/members/${memberId}`, { method: 'DELETE' })
}
