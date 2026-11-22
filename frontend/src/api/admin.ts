import { backendConnected } from '../config'
import { DEMO_TEST_REQUESTS, readDemoState, updateDemoState } from '../data/demoState'
import type { PendingRequest } from '../context/auth'
import { apiRequest } from './http'
import type { BackendPendingRequest } from './types'

export async function fetchPendingRequests(): Promise<PendingRequest[]> {
  if (!backendConnected) {
    const state = readDemoState()
    if (state.pendingRequests.length > 0) return state.pendingRequests
    return state.signedOut ? DEMO_TEST_REQUESTS : []
  }

  const requests =
    await apiRequest<BackendPendingRequest[]>('/api/admin/join-requests')

  return requests.map((request) => ({
    id: request.id,
    name: request.name,
    email: request.email,
    requestedAt: request.requested_at,
  }))
}

export async function acceptRequest(requestId: string): Promise<void> {
  if (!backendConnected) {
    updateDemoState((current) => {
      const request = current.pendingRequests.find(
        (item) => item.id === requestId,
      )

      if (!request) return current

      return {
        ...current,
        pendingRequests: current.pendingRequests.filter(
          (item) => item.id !== requestId,
        ),
        members: [
          ...current.members,
          {
            id: `demo-${Date.now()}`,
            name: request.name,
            email: request.email,
            role: 'member' as const,
          },
        ],
      }
    })
    return
  }

  await apiRequest(`/api/admin/join-requests/${requestId}/accept`, {
    method: 'POST',
  })
}

export async function rejectRequest(requestId: string): Promise<void> {
  if (!backendConnected) {
    updateDemoState((current) => ({
      ...current,
      pendingRequests: current.pendingRequests.filter(
        (item) => item.id !== requestId,
      ),
    }))
    return
  }

  await apiRequest(`/api/admin/join-requests/${requestId}/reject`, {
    method: 'POST',
  })
}
