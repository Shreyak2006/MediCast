import { useEffect, useMemo, useState } from 'react'
import { getInventory } from '../api/inventory'
import type { InventoryItem } from '../api/inventory'
import IndiaDengueMap from '../components/IndiaDengueMap'
import MonthlyUseChart from '../components/MonthlyUseChart'
import StockLedger from '../components/StockLedger'
import { useDisplayAuth } from '../context/useAuth'
import { getRecentMonths } from '../data/demoAnalytics'
import { getCoverInfo } from '../lib/cover'
import { formatNumber } from '../lib/format'

function DashboardPage() {
  const { organization } = useDisplayAuth()
  const [items, setItems] = useState<InventoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const months = useMemo(() => getRecentMonths(12), [])
  const [monthKey, setMonthKey] = useState(months[months.length - 1].key)
  const selectedMonth =
    months.find((month) => month.key === monthKey) ?? months[months.length - 1]

  useEffect(() => {
    let cancelled = false

    async function loadInventory() {
      try {
        const data = await getInventory()
        if (!cancelled) {
          setItems(data)
        }
      } catch {
        if (!cancelled) {
          setError('Could not load inventory. Please try again later.')
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadInventory()

    return () => {
      cancelled = true
    }
  }, [])

  const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0)
  const unitsNeeded = items.reduce(
    (sum, item) => sum + getCoverInfo(item.medicine, item.quantity).neededUnits,
    0,
  )

  return (
    <section>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">
        Dashboard
      </h1>
      <p className="mt-1 text-muted">
        Current stock for tracked medicines.
      </p>

      {isLoading && <p className="mt-6 text-muted">Loading inventory…</p>}

      {!isLoading && error && (
        <p
          role="alert"
          className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200"
        >
          {error}
        </p>
      )}

      {!isLoading && !error && items.length === 0 && (
        <p className="mt-6 text-muted">No inventory data yet.</p>
      )}

      {!isLoading && !error && items.length > 0 && (
        <>
          <div className="mt-6 flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-200 pb-3">
            <p className="text-sm text-muted">Tracked medicines</p>
            <p className="tabular-data text-sm font-medium text-ink">
              {items.length} {items.length === 1 ? 'medicine' : 'medicines'} ·{' '}
              {formatNumber(totalUnits)} units on hand
              {unitsNeeded > 0 && (
                <>
                  {' · '}
                  <span className="text-signal-low">
                    {formatNumber(unitsNeeded)} needed for 30-day cover
                  </span>
                </>
              )}
            </p>
          </div>

          <div className="mt-4">
            <StockLedger items={items} />
          </div>
        </>
      )}

      <section className="mt-8" aria-labelledby="demand-intelligence-heading">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2
              id="demand-intelligence-heading"
              className="text-lg font-semibold tracking-tight text-ink"
            >
              Demand intelligence
            </h2>
            <p className="mt-1 text-sm text-muted">
              Frontend demo data for planning; no live surveillance feed.
            </p>
          </div>
          <label className="text-xs text-muted">
            Month
            <select
              value={monthKey}
              onChange={(event) => setMonthKey(event.target.value)}
              className="tabular-data mt-1 block rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-ink focus:border-brand-600 focus:ring-2 focus:ring-brand-200 focus:outline-none"
            >
              {months.map((month) => (
                <option key={month.key} value={month.key}>
                  {month.fullLabel}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <MonthlyUseChart
              month={selectedMonth}
              medicines={items.map((item) => item.medicine)}
            />
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <IndiaDengueMap
              month={selectedMonth}
              selectedState={organization?.state}
            />
          </div>
        </div>
      </section>
    </section>
  )
}

export default DashboardPage
