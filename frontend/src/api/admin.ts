import type { PendingRequest } from '../context/auth'
import { apiRequest } from './http'
import type { BackendPendingRequest } from './types'

export async function fetchPendingRequests(): Promise<PendingRequest[]> {
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
  await apiRequest(`/api/admin/join-requests/${requestId}/accept`, {
    method: 'POST',
  })
}

export async function rejectRequest(requestId: string): Promise<void> {
  await apiRequest(`/api/admin/join-requests/${requestId}/reject`, {
    method: 'POST',
  })
}