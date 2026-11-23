import { useEffect, useMemo, useState } from 'react'
import { getInventory } from '../api/inventory'
import type { InventoryItem } from '../api/inventory'
import IndiaDengueMap from '../components/IndiaDengueMap'
import MonthlyUseChart from '../components/MonthlyUseChart'
import StockLedger from '../components/StockLedger'
import { useAuth } from '../context/useAuth'
import { getRecentMonths } from '../data/demoAnalytics'
import { getCoverInfo } from '../lib/cover'
import { formatNumber } from '../lib/format'

function DashboardPage() {
  const { organization } = useAuth()
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
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-brand-800">
            Operations overview
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Dashboard</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Monitor current stock, spot cover gaps, and review demo demand signals for planning.
          </p>
        </div>
        {organization?.name && (
          <div className="rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3 shadow-panel">
            <p className="text-xs text-muted">Organization</p>
            <p className="mt-1 text-sm font-medium text-ink">{organization.name}</p>
          </div>
        )}
      </div>

      {isLoading && (
        <div className="rounded-2xl border border-slate-200/70 bg-white/70 px-5 py-8 text-sm text-muted shadow-panel">
          Loading inventory…
        </div>
      )}

      {!isLoading && error && (
        <p
          role="alert"
          className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200"
        >
          {error}
        </p>
      )}

      {!isLoading && !error && items.length === 0 && (
        <div className="rounded-2xl border border-slate-200/70 bg-white/70 px-5 py-8 text-sm text-muted shadow-panel">
          No inventory data yet.
        </div>
      )}

      {!isLoading && !error && items.length > 0 && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-5 shadow-panel">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted">Tracked medicines</p>
              <p className="tabular-data mt-3 text-3xl font-semibold tracking-tight text-ink">{items.length}</p>
              <p className="mt-1 text-sm text-muted">Items in current inventory</p>
            </div>
            <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-5 shadow-panel">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted">Units on hand</p>
              <p className="tabular-data mt-3 text-3xl font-semibold tracking-tight text-ink">
                {formatNumber(totalUnits)}
              </p>
              <p className="mt-1 text-sm text-muted">Total tracked stock units</p>
            </div>
            <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-5 shadow-panel">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted">30-day gap</p>
              <p className={`tabular-data mt-3 text-3xl font-semibold tracking-tight ${unitsNeeded > 0 ? 'text-amber-700' : 'text-brand-800'}`}>
                {formatNumber(unitsNeeded)}
              </p>
              <p className="mt-1 text-sm text-muted">
                {unitsNeeded > 0 ? 'Units needed for target cover' : 'All items meet 30-day cover'}
              </p>
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold tracking-tight text-ink">Stock ledger</h2>
              <p className="text-xs text-muted">Share of tracked units</p>
            </div>
            <StockLedger items={items} />
          </div>
        </>
      )}

      <section aria-labelledby="demand-intelligence-heading" className="space-y-4 pt-2">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-brand-800">Planning signals</p>
            <h2 id="demand-intelligence-heading" className="mt-2 text-xl font-semibold tracking-tight text-ink">
              Demand intelligence
            </h2>
            <p className="mt-1 text-sm text-muted">
              Frontend demo data for planning; no live surveillance feed.
            </p>
          </div>
          <label className="text-xs font-medium text-muted">
            Month
            <select
              value={monthKey}
              onChange={(event) => setMonthKey(event.target.value)}
              className="tabular-data mt-1.5 block rounded-xl border border-slate-300/80 bg-white px-3 py-2 text-sm text-ink shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none"
            >
              {months.map((month) => (
                <option key={month.key} value={month.key}>
                  {month.fullLabel}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-6 shadow-panel">
            <MonthlyUseChart month={selectedMonth} medicines={items.map((item) => item.medicine)} />
          </div>
          <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-6 shadow-panel">
            <IndiaDengueMap month={selectedMonth} selectedState={organization?.state} />
          </div>
        </div>
      </section>
    </section>
  )
}

export default DashboardPage
