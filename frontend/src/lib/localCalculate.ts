import type { CalculationInput, CalculationResponse } from '../api/inventory'
import { getDemoSeasonalFactor } from '../data/demoAnalytics'

/**
 * Offline Calculator estimate, used only when POST /api/calculate is unreachable.
 * It mirrors the backend's arithmetic but uses the demo seasonal shape, so the
 * result is labeled "local estimate" in the UI and must not be treated as a
 * production forecast.
 */
export function calculateLocally(input: CalculationInput): CalculationResponse {
  if (input.medicine !== 'Dengue medicines') {
    return { status: 'received' }
  }

  const month = new Date().getMonth() + 1
  const rawSeasonalFactor = getDemoSeasonalFactor(month)
  const seasonalFactor = Math.max(0.25, Math.min(4, rawSeasonalFactor))
  const dailyAverage = input.yearly_sales / 365
  const expectedDailyUse = dailyAverage * seasonalFactor
  const targetStock = Math.ceil(expectedDailyUse * input.days)
  const shortfall = Math.max(0, targetStock - input.current_stock)

  return {
    status: shortfall > 0 ? 'Order needed' : 'Stock sufficient',
    daily_average: dailyAverage,
    seasonal_factor: seasonalFactor,
    expected_daily_use: expectedDailyUse,
    target_stock: targetStock,
    shortfall,
    baseline_source: 'month_fallback',
    adjustment_applied: false,
    capped: rawSeasonalFactor < 0.25 || rawSeasonalFactor > 4,
  }
}
