import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { getInventory, sendCalculation } from '../api/inventory'
import type { InventoryItem } from '../api/inventory'

const WHOLE_NUMBER = /^\d+$/

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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus(null)

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
      await sendCalculation({
        medicine,
        current_stock: Number(stockValue),
        yearly_sales: Number(salesValue),
        days: Number(daysValue),
      })
      setStatus({ type: 'success', message: 'Request sent successfully.' })
    } catch {
      setStatus({
        type: 'error',
        message: 'Could not send data. Please try again.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const hasMedicines = medicines.length > 0
  const formDisabled = isLoadingMedicines || !hasMedicines

  return (
    <section>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
        Calculator
      </h1>
      <p className="mt-1 text-slate-600">
        Send stock and sales data for a medicine.
      </p>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="mt-6 max-w-md rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
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
              setStatus(null)
            }}
            disabled={formDisabled}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
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
            }}
            disabled={formDisabled}
            aria-invalid={Boolean(errors.currentStock)}
            aria-describedby={
              errors.currentStock ? 'current-stock-error' : undefined
            }
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
          />
          {errors.currentStock && (
            <p
              id="current-stock-error"
              role="alert"
              className="mt-2 text-sm text-red-600"
            >
              {errors.currentStock}
            </p>
          )}
        </div>

        <div className="mt-4">
          <label
            htmlFor="yearly-sales"
            className="block text-sm font-medium text-slate-700"
          >
            Average sold per year (total units per year)
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
            }}
            disabled={formDisabled}
            aria-invalid={Boolean(errors.yearlySales)}
            aria-describedby={
              errors.yearlySales ? 'yearly-sales-error' : undefined
            }
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
          />
          {errors.yearlySales && (
            <p
              id="yearly-sales-error"
              role="alert"
              className="mt-2 text-sm text-red-600"
            >
              {errors.yearlySales}
            </p>
          )}
        </div>

        <div className="mt-4">
          <label
            htmlFor="days"
            className="block text-sm font-medium text-slate-700"
          >
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
            }}
            disabled={formDisabled}
            aria-invalid={Boolean(errors.days)}
            aria-describedby={errors.days ? 'days-error' : undefined}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
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
          className="mt-6 w-full rounded-lg bg-brand-600 px-4 py-2 font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Sending…' : 'Calculate'}
        </button>

        {status && (
          <p
            role="status"
            className={`mt-4 text-sm ${
              status.type === 'success' ? 'text-emerald-700' : 'text-red-600'
            }`}
          >
            {status.message}
          </p>
        )}
      </form>
    </section>
  )
}

export default CalculatorPage
