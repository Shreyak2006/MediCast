import type { InventoryItem } from '../api/inventory'

const STORAGE_KEY = 'medicast.inventoryAdjustments'

type Adjustments = Record<string, number>

function readAdjustments(): Adjustments {
  if (typeof window === 'undefined') return {}

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}

    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}

    return Object.fromEntries(
      Object.entries(parsed).filter(
        ([, value]) => typeof value === 'number' && Number.isFinite(value),
      ),
    ) as Adjustments
  } catch {
    return {}
  }
}

function writeAdjustments(adjustments: Adjustments) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(adjustments))
}

function adjustmentFor(medicine: string) {
  return readAdjustments()[medicine] ?? 0
}

export function applyLocalAdjustment(item: InventoryItem): InventoryItem {
  return {
    ...item,
    quantity: Math.max(0, item.quantity + adjustmentFor(item.medicine)),
  }
}

export function applyLocalAdjustments(items: InventoryItem[]): InventoryItem[] {
  return items.map(applyLocalAdjustment)
}

export function removeLocalStock(
  medicine: string,
  quantity: number,
  currentQuantity: number,
): InventoryItem {
  const adjustments = readAdjustments()
  const nextAdjustment = (adjustments[medicine] ?? 0) - quantity
  adjustments[medicine] = nextAdjustment
  writeAdjustments(adjustments)

  return {
    medicine,
    quantity: Math.max(0, currentQuantity - quantity),
  }
}
