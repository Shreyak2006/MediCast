import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { getInventory, sendCalculation } from '../api/inventory'
import type { CalculationResponse, InventoryItem } from '../api/inventory'
import CoverageMeter from '../components/CoverageMeter'
import SeasonalityChart from '../components/SeasonalityChart'
import { useAuth } from '../context/useAuth'
import { formatNumber } from '../lib/format'

const WHOLE_NUMBER = /^\d+$/

function formatSource(source?: string) {
  if (source === 'state_month') return 'state and month pattern'
  if (source === 'month_fallback') return 'month pattern'
  if (source === 'overall') return 'overall pattern'
  return 'annual average'
}

function StatusPill({ status }: { status: string }) {
  const sufficient = status.toLowerCase().includes('sufficient')

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${
        sufficient
          ? 'bg-brand-50 text-brand-800 ring-brand-100'
          : 'bg-amber-50 text-signal-low ring-amber-200'
      }`}
    >
      {status}
    </span>
  )
}

function Derivation({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="tabular-data mt-1 text-sm font-medium text-ink">{value}</dd>
    </div>
  )
}

type FieldErrors = {
  currentStock?: string
  yearlySales?: string
  days?: string
}

type Status = {
  type: 'success' | 'error'
  message: string
}

function CalculatorPage() {
  const { organization } = useAuth()
  const [medicines, setMedicines] = useState<InventoryItem[]>([])
  const [medicine, setMedicine] = useState('')
  const [isLoadingMedicines, setIsLoadingMedicines] = useState(true)
  const [medicinesError, setMedicinesError] = useState('')

  const [currentStock, setCurrentStock] = useState('')
  const [yearlySales, setYearlySales] = useState('')
  const [days, setDays] = useState('30')
  const [errors, setErrors] = useState<FieldErrors>({})

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [status, setStatus] = useState<Status | null>(null)
  const [result, setResult] = useState<CalculationResponse | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadMedicines() {
      try {
        const items = await getInventory()
        if (!cancelled) {
          setMedicines(items)
          setMedicine(items[0]?.medicine ?? '')
        }
      } catch {
        if (!cancelled) {
          setMedicinesError('Could not load medicines. Please try again later.')
        }
      } finally {
        if (!cancelled) {
          setIsLoadingMedicines(false)
        }
      }
    }

    loadMedicines()

    return () => {
      cancelled = true
    }
  }, [])

  function clearError(field: keyof FieldErrors) {
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  function clearResult() {
    setStatus(null)
    setResult(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    clearResult()

    const stockValue = currentStock.trim()
    const salesValue = yearlySales.trim()
    const daysValue = days.trim()

    const nextErrors: FieldErrors = {}

    if (!WHOLE_NUMBER.test(stockValue)) {
      nextErrors.currentStock =
        'Current stock must be a whole number, 0 or greater.'
    }

    if (!WHOLE_NUMBER.test(salesValue) || Number(salesValue) <= 0) {
      nextErrors.yearlySales =
        'Average sold per year must be a positive whole number.'
    }

    if (!WHOLE_NUMBER.test(daysValue) || Number(daysValue) <= 0) {
      nextErrors.days = 'Days of stock to cover must be a positive whole number.'
    }

    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    setIsSubmitting(true)

    try {
      const val = await sendCalculation({
        medicine,
        current_stock: Number(stockValue),
        yearly_sales: Number(salesValue),
        days: Number(daysValue),
        state: organization?.state,
      })
      setResult(val)
      setStatus({
        type: 'success',
        message: 'Calculation ready from the backend.',
      })
    } catch (error) {
      setStatus({
        type: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Could not send data. Please try again.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const hasMedicines = medicines.length > 0
  const formDisabled = isLoadingMedicines || !hasMedicines

  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-brand-800">Demand forecast</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Calculator</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Estimate target stock from current inventory, yearly sales, and your organization's state pattern.
        </p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <form
          onSubmit={handleSubmit}
          noValidate
          className="rounded-2xl border border-slate-200/70 bg-white/80 p-6 shadow-panel"
        >
          <div>
            <label
              htmlFor="calculator-medicine"
              className="block text-sm font-medium text-slate-700"
            >
              Medicine
            </label>
            <select
              id="calculator-medicine"
              value={medicine}
              onChange={(event) => {
                setMedicine(event.target.value)
                clearResult()
              }}
              disabled={formDisabled}
              className="mt-1.5 w-full rounded-xl border border-slate-300/80 bg-white px-3.5 py-2.5 text-ink focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none disabled:bg-slate-100 disabled:text-muted"
            >
              {isLoadingMedicines && <option value="">Loading medicines…</option>}
              {!isLoadingMedicines && !hasMedicines && (
                <option value="">No medicines yet</option>
              )}
              {medicines.map((item) => (
                <option key={item.medicine} value={item.medicine}>
                  {item.medicine}
                </option>
              ))}
            </select>

            {medicinesError && (
              <p role="alert" className="mt-2 text-sm text-red-600">
                {medicinesError}
              </p>
            )}
          </div>

          <div className="mt-4">
            <label
              htmlFor="current-stock"
              className="block text-sm font-medium text-slate-700"
            >
              Current stock
            </label>
            <input
              id="current-stock"
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              placeholder="e.g. 100"
              value={currentStock}
              onChange={(event) => {
                setCurrentStock(event.target.value)
                clearError('currentStock')
                clearResult()
              }}
              disabled={formDisabled}
              aria-invalid={Boolean(errors.currentStock)}
              aria-describedby={
                errors.currentStock ? 'current-stock-error' : undefined
              }
              className="tabular-data mt-1.5 w-full rounded-xl border border-slate-300/80 bg-white px-3.5 py-2.5 text-ink focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none disabled:bg-slate-100 disabled:text-muted"
            />
            {errors.currentStock && (
              <p id="current-stock-error" role="alert" className="mt-2 text-sm text-red-600">
                {errors.currentStock}
              </p>
            )}
          </div>

          <div className="mt-4">
            <label htmlFor="yearly-sales" className="block text-sm font-medium text-slate-700">
              Average sold per year
            </label>
            <input
              id="yearly-sales"
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              placeholder="e.g. 1200"
              value={yearlySales}
              onChange={(event) => {
                setYearlySales(event.target.value)
                clearError('yearlySales')
                clearResult()
              }}
              disabled={formDisabled}
              aria-invalid={Boolean(errors.yearlySales)}
              aria-describedby={errors.yearlySales ? 'yearly-sales-error' : undefined}
              className="tabular-data mt-1.5 w-full rounded-xl border border-slate-300/80 bg-white px-3.5 py-2.5 text-ink focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none disabled:bg-slate-100 disabled:text-muted"
            />
            {errors.yearlySales && (
              <p id="yearly-sales-error" role="alert" className="mt-2 text-sm text-red-600">
                {errors.yearlySales}
              </p>
            )}
          </div>

          <div className="mt-4">
            <label htmlFor="days" className="block text-sm font-medium text-slate-700">
              Days of stock to cover
            </label>
            <input
              id="days"
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              value={days}
              onChange={(event) => {
                setDays(event.target.value)
                clearError('days')
                clearResult()
              }}
              disabled={formDisabled}
              aria-invalid={Boolean(errors.days)}
              aria-describedby={errors.days ? 'days-error' : undefined}
              className="tabular-data mt-1.5 w-full rounded-xl border border-slate-300/80 bg-white px-3.5 py-2.5 text-ink focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none disabled:bg-slate-100 disabled:text-muted"
            />
            {errors.days && (
              <p id="days-error" role="alert" className="mt-2 text-sm text-red-600">
                {errors.days}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting || formDisabled}
            className="mt-6 w-full rounded-xl bg-brand-700 px-4 py-2.5 font-medium text-white shadow-sm shadow-brand-900/10 transition-colors hover:bg-brand-800 focus:ring-2 focus:ring-brand-200 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
          >
            {isSubmitting ? 'Calculating…' : 'Calculate'}
          </button>

          {status && (
            <p
              role={status.type === 'error' ? 'alert' : 'status'}
              className={`mt-4 rounded-xl px-3.5 py-2.5 text-sm ${
                status.type === 'error'
                  ? 'bg-red-50 text-red-700 ring-1 ring-red-200'
                  : 'bg-brand-50 text-brand-800 ring-1 ring-brand-100'
              }`}
            >
              {status.message}
            </p>
          )}
        </form>

        <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-6 shadow-panel">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted">Forecast result</p>
              <h2 className="mt-1 text-lg font-semibold text-ink">{medicine || 'Select a medicine'}</h2>
            </div>
            {result && <StatusPill status={result.status} />}
          </div>

          {result && result.target_stock !== undefined ? (
            <>
              <div className="mt-6 rounded-2xl bg-slate-50/80 p-5 ring-1 ring-slate-200/70">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted">Target stock</p>
                <p className="tabular-data mt-2 text-4xl font-semibold tracking-tight text-ink">
                  {formatNumber(result.target_stock)}
                  <span className="ml-2 text-sm font-normal text-muted">units</span>
                </p>
                <p className="mt-2 text-sm text-muted">
                  For {days || '—'} days of cover
                  {organization?.state ? ` in ${organization.state}` : ''}.
                </p>
              </div>

              <div className="mt-6 border-t border-slate-200/70 pt-5">
                <CoverageMeter
                  current={Number(currentStock)}
                  target={result.target_stock}
                  shortfall={result.shortfall ?? 0}
                />
              </div>

              <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-slate-200/70 pt-5">
                <Derivation label="Daily average" value={formatNumber(result.daily_average ?? 0, 1)} />
                <Derivation label="Seasonal factor" value={`×${formatNumber(result.seasonal_factor ?? 0, 2)}`} />
                <Derivation label="Expected daily use" value={formatNumber(result.expected_daily_use ?? 0, 2)} />
                <Derivation label="Cover period" value={`${days} days`} />
              </dl>

              <div className="mt-6 space-y-1.5 rounded-xl bg-slate-50/70 px-4 py-3 text-xs text-muted ring-1 ring-slate-200/70">
                <p>Baseline: {formatSource(result.baseline_source)}</p>
                <p>
                  Rainfall adjustment {result.adjustment_applied ? 'applied' : 'not applied'}
                  {result.capped ? ' · seasonal factor capped' : ''}
                </p>
              </div>
            </>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300/80 bg-slate-50/50 px-4 py-8 text-sm text-muted">
              {result
                ? 'Request received. No calculation details were returned.'
                : 'Enter stock and sales figures, then calculate to see the target.'}
            </div>
          )}
        </div>
      </div>

      <div>
        <SeasonalityChart state={organization?.state} />
      </div>
    </section>
  )
}

export default CalculatorPage
