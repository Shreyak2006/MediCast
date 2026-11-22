import { useContext } from 'react'
import { backendConnected } from '../config'
import {
  DEMO_TEST_MEMBERS,
  DEMO_TEST_ORGANIZATION,
  DEMO_TEST_ROLE,
  DEMO_TEST_USER,
} from '../data/demoState'
import { AuthContext } from './auth'

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}

/**
 * Auth values kept populated in standalone mode. When nobody is signed in the
 * dev page dock can still open every page, so fall back to the always-present
 * "test" profile, organization, role, and members. Connected mode is unchanged.
 */
export function useDisplayAuth() {
  const context = useAuth()

  if (backendConnected || context.user) {
    return context
  }

  return {
    ...context,
    user: DEMO_TEST_USER,
    organization: context.organization ?? DEMO_TEST_ORGANIZATION,
    role: context.role ?? DEMO_TEST_ROLE,
    members: context.members.length > 0 ? context.members : DEMO_TEST_MEMBERS,
  }
}
