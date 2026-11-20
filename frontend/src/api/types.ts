import type { AuthState } from '../context/auth'

export type BackendUser = {
  id: string
  name: string
  email: string
}

export type BackendOrganization = {
  id: string
  name: string
  code: string
  state: string | null
  district: string | null
  pincode: string | null
  hospital_type: 'government' | 'private' | 'clinic' | null
}

export type BackendMember = {
  id: string
  name: string
  email: string
  role: 'admin' | 'member'
}

export type BackendAuthState = {
  user: BackendUser
  organization: BackendOrganization | null
  role: 'admin' | 'member' | null
  members: BackendMember[]
  pending_join_code: string | null
}

export type BackendAuthResponse = BackendAuthState & { token: string }

export type BackendPendingRequest = {
  id: string
  name: string
  email: string
  requested_at: string
}

export function mapAuthState(payload: BackendAuthState): AuthState {
  return {
    user: {
      id: payload.user.id,
      name: payload.user.name,
      email: payload.user.email,
    },
    organization: payload.organization
      ? {
          id: payload.organization.id,
          name: payload.organization.name,
          code: payload.organization.code,
          state: payload.organization.state ?? undefined,
          district: payload.organization.district ?? undefined,
          pincode: payload.organization.pincode ?? undefined,
          hospital_type: payload.organization.hospital_type ?? undefined,
        }
      : null,
    role: payload.role,
    members: payload.members.map((member) => ({
      id: member.id,
      name: member.name,
      email: member.email,
      role: member.role,
    })),
    pendingJoinCode: payload.pending_join_code,
  }
}
