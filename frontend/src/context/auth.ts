import { createContext } from 'react'

export type Role = 'admin' | 'member'

export type AuthUser = {
  id: string
  name: string
  email: string
}

export type HospitalType = 'government' | 'private' | 'clinic'

export type CreateOrganizationInput = {
  name: string
  state: string
  district: string
  pincode: string
  hospital_type: HospitalType
}

export type AuthOrganization = {
  id: string
  name: string
  code: string
  state?: string
  district?: string
  pincode?: string
  hospital_type?: HospitalType
}

export type AuthMember = {
  id: string
  name: string
  email: string
  role: Role
}

export type PendingRequest = {
  id: string
  name: string
  email: string
  requestedAt: string
}

export type AuthState = {
  user: AuthUser | null
  organization: AuthOrganization | null
  role: Role | null
  members: AuthMember[]
  pendingJoinCode: string | null
}

export type AuthContextValue = AuthState & {
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (name: string, email: string, password: string) => Promise<void>
  createOrganization: (input: CreateOrganizationInput) => Promise<string>
  joinOrganization: (code: string) => Promise<void>
  refresh: () => Promise<AuthState>
  removeMember: (memberId: string) => Promise<void>
  leaveOrganization: () => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
