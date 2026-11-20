import { getMedicineUse, getRecentMonths } from '../data/demoAnalytics'
import type { MonthOption } from '../data/demoAnalytics'

export type CoverLevel = 'good' | 'watch' | 'critical' | 'unknown'

export type CoverInfo = {
  level: CoverLevel
  days: number
  title: string
  detail: string
  basis: string
  targetUnits: number
  neededUnits: number
  surplusUnits: number
}

const TARGET_DAYS = 30

const months: MonthOption[] = getRecentMonths(12)
const lastMonth = months[months.length - 1]

function daysInMonth(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number)
  return new Date(year, month, 0).getDate()
}

/**
 * Frontend-only estimate. The backend supplies stock but no dispensing history,
 * so daily use is derived from the demo last-month usage dataset.
 */
export function getCoverInfo(medicine: string, quantity: number): CoverInfo {
  const used = getMedicineUse(lastMonth.key, [medicine])[0]?.units ?? 0
  const basis = `${used} units in ${lastMonth.fullLabel} (demo)`

  if (used <= 0) {
    return {
      level: 'unknown',
      days: Infinity,
      title: 'No usage basis',
      detail: 'Add demo usage to estimate need',
      basis,
      targetUnits: 0,
      neededUnits: 0,
      surplusUnits: 0,
    }
  }

  const dailyUse = used / daysInMonth(lastMonth.key)
  const days = Math.max(0, Math.floor(quantity / dailyUse))
  const targetUnits = Math.ceil(dailyUse * TARGET_DAYS)
  const neededUnits = Math.max(0, targetUnits - quantity)
  const surplusUnits = Math.max(0, quantity - targetUnits)
  const needText =
    neededUnits > 0
      ? `Need ${neededUnits} units for ${TARGET_DAYS} days`
      : `${surplusUnits} units above ${TARGET_DAYS}-day target`

  if (days >= TARGET_DAYS) {
    return {
      level: 'good',
      days,
      title: 'Good for next 30 days',
      detail: needText,
      basis,
      targetUnits,
      neededUnits,
      surplusUnits,
    }
  }

  if (days >= 14) {
    return {
      level: 'watch',
      days,
      title: `Plan restock in ${days} days`,
      detail: needText,
      basis,
      targetUnits,
      neededUnits,
      surplusUnits,
    }
  }

  return {
    level: 'critical',
    days,
    title: `Possible runout in ${days} days`,
    detail: needText,
    basis,
    targetUnits,
    neededUnits,
    surplusUnits,
  }
}
