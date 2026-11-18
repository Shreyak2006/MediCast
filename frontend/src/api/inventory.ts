export type InventoryItem = {
  medicine: string
  quantity: number
}

export type CalculationInput = {
  medicine: string
  current_stock: number
  yearly_sales: number
  days: number
}

export type CalculationResponse = {
  status: string
  daily_average?: number
  seasonal_factor?: number
  expected_daily_use?: number
  target_stock?: number
  shortfall?: number
  baseline_source?: string
  adjustment_applied?: boolean
  capped?: boolean
}

export type PendingRequest = {
  id: string
  name: string
  email: string
  requestedAt: string
}

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'
).replace(/\/+$/, '')

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, init)

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`)
  }

  return response.json() as Promise<T>
}

export function getInventory(): Promise<InventoryItem[]> {
  return request<InventoryItem[]>('/api/inventory')
}

export function addInventory(input: InventoryItem): Promise<InventoryItem> {
  return request<InventoryItem>('/api/inventory', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}

export function addMedicine(medicine: string): Promise<InventoryItem> {
  return request<InventoryItem>('/api/medicines', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ medicine }),
  })
}

export function sendCalculation(
  input: CalculationInput,
): Promise<CalculationResponse> {
  return request<CalculationResponse>('/api/calculate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}

// TODO: Replace with a GET request to the pending join requests endpoint.
export function fetchPendingRequests(): Promise<PendingRequest[]> {
  return Promise.resolve([
    {
      id: 'req-1',
      name: 'Priya Nair',
      email: 'priya.nair@example.com',
      requestedAt: '2026-11-16',
    },
    {
      id: 'req-2',
      name: 'Arjun Rao',
      email: 'arjun.rao@example.com',
      requestedAt: '2026-11-15',
    },
  ])
}

// TODO: Replace with a POST request to the accept request endpoint.
export function acceptRequest(requestId: string): Promise<void> {
  void requestId
  return Promise.resolve()
}

// TODO: Replace with a POST request to the reject request endpoint.
export function rejectRequest(requestId: string): Promise<void> {
  void requestId
  return Promise.resolve()
}
