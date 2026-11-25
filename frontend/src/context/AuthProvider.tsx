import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import * as authApi from '../api/auth'
import { getToken, setToken } from '../api/http'
import * as organizationApi from '../api/organizations'
import { AuthContext } from './auth'
import type { AuthState, CreateOrganizationInput } from './auth'

const EMPTY_STATE: AuthState = {
  user: null,
  organization: null,
  role: null,
  members: [],
  pendingJoinCode: null,
}

function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(EMPTY_STATE)
  const [isLoading, setIsLoading] = useState(true)

  const refresh = useCallback(async (): Promise<AuthState> => {
    if (!getToken()) {
      setState(EMPTY_STATE)
      return EMPTY_STATE
    }

    try {
      const nextState = await authApi.getMe()
      setState(nextState)
      return nextState
    } catch {
      setToken(null)
      setState(EMPTY_STATE)
      return EMPTY_STATE
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function restoreSession() {
      if (!getToken()) {
        setIsLoading(false)
        return
      }

      try {
        const restored = await authApi.getMe()
        if (!cancelled) {
          setState(restored)
        }
      } catch {
        setToken(null)
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    restoreSession()

    return () => {
      cancelled = true
    }
  }, [])

  async function login(email: string, password: string) {
    setState(await authApi.login(email, password))
  }

  async function signup(name: string, email: string, password: string) {
    setState(await authApi.signup(name, email, password))
  }

  async function createOrganization(input: CreateOrganizationInput) {
    const nextState = await organizationApi.createOrganization(input)
    setState(nextState)

    if (!nextState.organization) {
      throw new Error('The organization was not created')
    }
    return nextState.organization.code
  }

  async function joinOrganization(code: string) {
    setState(await organizationApi.joinOrganization(code))
  }

  async function removeMember(memberId: string) {
    await organizationApi.removeMember(memberId)
    await refresh()
  }

  async function leaveOrganization() {
    setState(await organizationApi.leaveOrganization())
  }

  async function logout() {
    try {
      await authApi.logout()
    } finally {
      setState(EMPTY_STATE)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        ...state,
        isLoading,
        login,
        signup,
        createOrganization,
        joinOrganization,
        refresh,
        removeMember,
        leaveOrganization,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export default AuthProvider
