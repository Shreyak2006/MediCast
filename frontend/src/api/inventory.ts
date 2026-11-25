import { apiRequest } from './http'

export type InventoryItem = {
  medicine: string
  quantity: number
}

export type CalculationInput = {
  medicine: string
  current_stock: number
  yearly_sales: number
  days: number
  /** Organization state; enables the state-month baseline and rainfall lookup. */
  state?: string
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

export function getInventory(): Promise<InventoryItem[]> {
  return apiRequest<InventoryItem[]>('/api/inventory')
}

export function addInventory(input: InventoryItem): Promise<InventoryItem> {
  return apiRequest<InventoryItem>('/api/inventory', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function removeInventory(input: InventoryItem): Promise<InventoryItem> {
  return apiRequest<InventoryItem>('/api/inventory/remove', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function addMedicine(medicine: string): Promise<InventoryItem> {
  return apiRequest<InventoryItem>('/api/medicines', {
    method: 'POST',
    body: JSON.stringify({ medicine }),
  })
}

export function sendCalculation(
  input: CalculationInput,
): Promise<CalculationResponse> {
  return apiRequest<CalculationResponse>('/api/calculate', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}