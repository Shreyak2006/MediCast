import { createContext } from 'react'

export type Role = 'admin' | 'member'

export type AuthUser = {
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

export type AuthContextValue = {
  user: AuthUser | null
  organization: AuthOrganization | null
  role: Role | null
  members: AuthMember[]
  login: (email: string) => void
  signup: (name: string, email: string) => void
  createOrganization: (input: CreateOrganizationInput) => string
  joinOrganization: (code: string) => void
  addMember: (name: string, email: string) => void
  removeMember: (memberId: string) => void
  leaveOrganization: () => void
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
