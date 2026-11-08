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
