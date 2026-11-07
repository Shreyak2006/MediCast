import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { addInventory, getInventory } from '../api/inventory'
import type { InventoryItem } from '../api/inventory'

const POSITIVE_WHOLE_NUMBER = /^\d+$/

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path strokeLinecap="round" d="M10 4v12M4 10h12" />
    </svg>
  )
}

function InventoryPage() {
  const [medicines, setMedicines] = useState<InventoryItem[]>([])
  const [medicine, setMedicine] = useState('')
  const [isLoadingMedicines, setIsLoadingMedicines] = useState(true)
  const [medicinesError, setMedicinesError] = useState('')

  const [quantity, setQuantity] = useState('')
  const [error, setError] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [isAddOpen, setIsAddOpen] = useState(false)

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

  useEffect(() => {
    if (!isAddOpen) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsAddOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isAddOpen])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setConfirmation('')

    const value = quantity.trim()

    if (!POSITIVE_WHOLE_NUMBER.test(value) || Number(value) <= 0) {
      setError('Quantity must be a positive whole number.')
      return
    }

    setError('')
    setIsSubmitting(true)

    try {
      const item = await addInventory({ medicine, quantity: Number(value) })
      setMedicines((current) =>
        current.map((m) => (m.medicine === item.medicine ? item : m))
      )
      setConfirmation(`Added ${Number(value)} to ${medicine}.`)
      setQuantity('')
    } catch {
      setError('Could not add stock. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  function openAddModal() {
    setIsAddOpen(true)
  }

  function closeAddModal() {
    setIsAddOpen(false)
  }

  const hasMedicines = medicines.length > 0
  const formDisabled = isLoadingMedicines || !hasMedicines

  return (
    <section>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Inventory Entry
        </h1>
        <button
          type="button"
          onClick={openAddModal}
          aria-label="Add medicine"
          title="Add medicine"
          className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 focus:ring-2 focus:ring-brand-200 focus:outline-none"
        >
          <PlusIcon /> Add medicine
        </button>
      </div>
      <p className="mt-1 text-slate-600">
        Record incoming stock for a medicine.
      </p>

      {!isLoadingMedicines && (
        <div className="mt-6 max-w-md rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-sm font-semibold text-slate-900">
            Medicines
          </h2>
          <ul className="mt-2 space-y-2">
            {medicines.length === 0 ? (
              <li className="px-2 py-2 text-sm text-slate-500">
                No medicines yet
              </li>
            ) : (
              medicines.map((item) => (
                <li
                  key={item.medicine}
                  className="flex items-center justify-between px-2 py-2 text-sm border-b border-slate-100 last:border-0"
                >
                  <span className="text-slate-700">{item.medicine}</span>
                  <span className="text-slate-500">{item.quantity}</span>
                </li>
              ))
            )}
          </ul>
        </div>
      )}


      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={closeAddModal}
            aria-hidden="true"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-medicine-title"
            className="relative w-full max-w-sm rounded-xl bg-white p-6 shadow-xl ring-1 ring-slate-200"
          >
            <h2
              id="add-medicine-title"
              className="text-lg font-semibold text-slate-900"
            >
              Stock Entry
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Add stock to a medicine.
            </p>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <label
                htmlFor="modal-medicine"
                className="block text-sm font-medium text-slate-700"
              >
                Medicine
              </label>
              <select
                id="modal-medicine"
                value={medicine}
                onChange={(event) => {
                  setMedicine(event.target.value)
                  setError('')
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

              <label
                htmlFor="modal-quantity"
                className="block text-sm font-medium text-slate-700"
              >
                Quantity
              </label>
              <input
                id="modal-quantity"
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                placeholder="e.g. 50"
                value={quantity}
                onChange={(event) => {
                  setQuantity(event.target.value)
                  setError('')
                }}
                disabled={formDisabled}
                aria-invalid={Boolean(error)}
                aria-describedby="modal-quantity-error"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
              />
              {error && (
                <p id="modal-quantity-error" role="alert" className="mt-2 text-sm text-red-600">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting || formDisabled}
                className="w-full rounded-lg bg-brand-600 px-4 py-2 font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Adding…' : 'Add to stock'}
              </button>

              {confirmation && (
                <p role="status" className="mt-2 text-sm text-emerald-700">
                  {confirmation}
                </p>
              )}
            </form>
          </div>
        </div>
      )}
    </section>
  )
}

export default InventoryPage
