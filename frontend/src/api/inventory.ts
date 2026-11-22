import { API_BASE_URL, backendConnected } from '../config'
import {
  DEMO_TEST_INVENTORY,
  readDemoState,
  updateDemoState,
} from '../data/demoState'
import { applyLocalAdjustments } from '../lib/localStock'
import { calculateLocally } from '../lib/localCalculate'

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
  /** Where the result came from; local estimates are labeled in the UI. */
  source?: 'backend' | 'local'
}

/** Only used for the still-disconnected inventory/calculation endpoints. */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, init)

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`)
  }

  return response.json() as Promise<T>
}

export function getInventory(): Promise<InventoryItem[]> {
  if (!backendConnected) {
    const state = readDemoState()
    const inventory =
      state.inventory.length > 0
        ? state.inventory
        : state.signedOut
          ? DEMO_TEST_INVENTORY
          : state.inventory
    return Promise.resolve(applyLocalAdjustments(inventory))
  }

  return request<InventoryItem[]>('/api/inventory')
}

export function addInventory(input: InventoryItem): Promise<InventoryItem> {
  if (!backendConnected) {
    return Promise.resolve(
      updateDemoState((current) => {
        const existing = current.inventory.find(
          (item) => item.medicine === input.medicine,
        )

        return {
          ...current,
          inventory: existing
            ? current.inventory.map((item) =>
                item.medicine === input.medicine
                  ? { ...item, quantity: item.quantity + input.quantity }
                  : item,
              )
            : [...current.inventory, { ...input }],
        }
      }).inventory.find((item) => item.medicine === input.medicine) ?? input,
    )
  }

  return request<InventoryItem>('/api/inventory', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}

export function addMedicine(medicine: string): Promise<InventoryItem> {
  if (!backendConnected) {
    return Promise.resolve({ medicine, quantity: 0 })
  }

  return request<InventoryItem>('/api/medicines', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ medicine }),
  })
}

const CALCULATION_TIMEOUT_MS = 2500

async function postCalculation(
  input: CalculationInput,
): Promise<CalculationResponse> {
  const controller = new AbortController()
  const timeout = window.setTimeout(
    () => controller.abort(),
    CALCULATION_TIMEOUT_MS,
  )

  try {
    const response = await fetch(`${API_BASE_URL}/api/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`)
    }

    const payload = (await response.json()) as CalculationResponse
    return { ...payload, source: 'backend' }
  } finally {
    window.clearTimeout(timeout)
  }
}

/**
 * Calculator stays connected even in standalone mode: it always tries the real
 * endpoint first and only computes locally when the backend cannot be reached.
 */
export async function sendCalculation(
  input: CalculationInput,
): Promise<CalculationResponse> {
  try {
    return await postCalculation(input)
  } catch {
    return { ...calculateLocally(input), source: 'local' }
  }
}
