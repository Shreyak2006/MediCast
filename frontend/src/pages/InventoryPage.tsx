import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { addInventory, getInventory } from '../api/inventory'
import type { InventoryItem } from '../api/inventory'
import CoverStatus from '../components/CoverStatus'
import StockLedger from '../components/StockLedger'
import type { StockAction } from '../components/StockLedger'
import { useAuth } from '../context/useAuth'
import { getCoverInfo } from '../lib/cover'
import {
  applyLocalAdjustment,
  applyLocalAdjustments,
  removeLocalStock,
} from '../lib/localStock'
import { formatNumber } from '../lib/format'

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

function MinusIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path strokeLinecap="round" d="M4 10h12" />
    </svg>
  )
}

function InventoryPage() {
  const { role } = useAuth()
  const isAdmin = role === 'admin'

  const [medicines, setMedicines] = useState<InventoryItem[]>([])
  const [medicine, setMedicine] = useState('')
  const [isLoadingMedicines, setIsLoadingMedicines] = useState(true)
  const [medicinesError, setMedicinesError] = useState('')

  const [mode, setMode] = useState<StockAction>('add')
  const [quantity, setQuantity] = useState('')
  const [error, setError] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const isAdding = mode === 'add'

  useEffect(() => {
    let cancelled = false

    async function loadMedicines() {
      try {
        const items = await getInventory()
        if (!cancelled) {
          setMedicines(applyLocalAdjustments(items))
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
    if (!isModalOpen) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsModalOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isModalOpen])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setConfirmation('')

    const value = quantity.trim()
    const amount = Number(value)

    if (!POSITIVE_WHOLE_NUMBER.test(value) || amount <= 0) {
      setError(
        isAdding
          ? 'Quantity must be a positive whole number.'
          : 'Enter a positive whole number of units to remove.',
      )
      return
    }

    if (!isAdding && selectedItem && amount > selectedItem.quantity) {
      setError(`Only ${selectedItem.quantity} units are available to remove.`)
      return
    }

    setError('')
    setIsSubmitting(true)

    try {
      if (isAdding) {
        const updated = await addInventory({ medicine, quantity: amount })
        const item = applyLocalAdjustment(updated)
        setMedicines((current) =>
          current.map((entry) =>
            entry.medicine === item.medicine ? item : entry,
          ),
        )
        setConfirmation(`Added ${amount} units to ${medicine}.`)
      } else {
        const item = removeLocalStock(
          medicine,
          amount,
          selectedItem?.quantity ?? 0,
        )
        setMedicines((current) =>
          current.map((entry) =>
            entry.medicine === item.medicine ? item : entry,
          ),
        )
        setConfirmation(
          `Removed ${amount} units from ${medicine}. Saved in this browser only.`,
        )
      }
      setQuantity('')
    } catch {
      setError(
        isAdding
          ? 'Could not add stock. Please try again.'
          : 'Could not remove stock. Please try again.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  function openModal(medicineName?: string, action: StockAction = 'add') {
    if (!isAdmin) return
    if (medicineName) {
      setMedicine(medicineName)
    }
    setMode(action)
    setQuantity('')
    setError('')
    setConfirmation('')
    setIsModalOpen(true)
  }

  function closeModal() {
    setIsModalOpen(false)
  }

  const hasMedicines = medicines.length > 0
  const formDisabled = isLoadingMedicines || !hasMedicines
  const totalUnits = medicines.reduce((sum, item) => sum + item.quantity, 0)

  const selectedItem = medicines.find((item) => item.medicine === medicine)
  const quantityValue = quantity.trim()
  const enteredQuantity = Number(quantityValue)
  const hasValidQuantity =
    POSITIVE_WHOLE_NUMBER.test(quantityValue) &&
    enteredQuantity > 0 &&
    (isAdding || !selectedItem || enteredQuantity <= selectedItem.quantity)
  const previewQuantity =
    selectedItem && hasValidQuantity
      ? isAdding
        ? selectedItem.quantity + enteredQuantity
        : selectedItem.quantity - enteredQuantity
      : null
  const currentCover = selectedItem
    ? getCoverInfo(medicine, selectedItem.quantity)
    : null
  const afterCover =
    previewQuantity !== null ? getCoverInfo(medicine, previewQuantity) : null
  const coverByMedicine = medicines.map((item) => ({
    item,
    cover: getCoverInfo(item.medicine, item.quantity),
  }))
  const restockItems = coverByMedicine.filter(
    ({ cover }) => cover.neededUnits > 0,
  )
  const totalNeeded = restockItems.reduce(
    (sum, { cover }) => sum + cover.neededUnits,
    0,
  )

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Inventory entry
        </h1>
        {isAdmin ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => openModal(undefined, 'add')}
              aria-label="Add stock"
              title="Add stock"
              className="inline-flex items-center rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 focus:ring-2 focus:ring-brand-200 focus:outline-none motion-reduce:transition-none"
            >
              <PlusIcon /> Add stock
            </button>
            <button
              type="button"
              onClick={() => openModal(undefined, 'remove')}
              aria-label="Remove stock"
              title="Remove stock"
              className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 focus:ring-2 focus:ring-brand-200 focus:outline-none motion-reduce:transition-none"
            >
              <MinusIcon /> Remove stock
            </button>
          </div>
        ) : (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-muted ring-1 ring-inset ring-slate-200">
            Read only
          </span>
        )}
      </div>
      <p className="mt-1 text-muted">
        {isAdmin
          ? 'Add incoming stock or record stock issued for a medicine.'
          : 'View current stock and cover estimates. Only admins can change stock.'}
      </p>

      {!isAdmin && (
        <p className="mt-4 rounded-lg bg-canvas px-4 py-3 text-sm text-muted ring-1 ring-slate-200">
          Inventory is read-only for members. Contact an admin to add or remove
          stock.
        </p>
      )}

      {!isLoadingMedicines && medicinesError && (
        <p
          role="alert"
          className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200"
        >
          {medicinesError}
        </p>
      )}

      {!isLoadingMedicines && !medicinesError && (
        <>
          <div className="mt-6 flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-200 pb-3">
            <p className="text-sm text-muted">Stock ledger</p>
            <p className="tabular-data text-sm font-medium text-ink">
              {formatNumber(totalUnits)} units across {medicines.length}{' '}
              {medicines.length === 1 ? 'medicine' : 'medicines'}
            </p>
          </div>

          <div className="mt-4">
            <StockLedger
              items={medicines}
              onAction={isAdmin ? openModal : undefined}
              showCoverage
              emptyMessage="No medicines yet"
            />
            <p className="mt-2 text-xs text-muted">
              Cover is estimated from demo last-month usage. Green: 30+ days ·
              Amber: 14–29 days · Red: under 14 days.
            </p>
            {isAdmin && (
              <p className="mt-1 text-xs text-muted">
                Admin removals are saved in this browser only; admin additions
                sync to the server.
              </p>
            )}
          </div>

          <div className="mt-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-muted">
                  Restock to 30-day target
                </p>
                <h2 className="mt-1 text-base font-semibold text-ink">
                  How much medicine is needed
                </h2>
              </div>
              <p className="tabular-data text-2xl font-semibold tracking-tight text-ink">
                {formatNumber(totalNeeded)}
                <span className="ml-1 text-sm font-normal text-muted">
                  units total
                </span>
              </p>
            </div>

            {restockItems.length > 0 ? (
              <ul className="mt-4 divide-y divide-slate-100 border-t border-slate-200">
                {restockItems.map(({ item, cover }) => (
                  <li
                    key={item.medicine}
                    className="flex items-center justify-between gap-3 py-2.5 text-sm"
                  >
                    <span className="min-w-0 truncate text-ink">
                      {item.medicine}
                      <span className="tabular-data ml-2 text-xs text-muted">
                        {cover.days} days left
                      </span>
                    </span>
                    <span className="tabular-data shrink-0 font-medium text-signal-low">
                      +{formatNumber(cover.neededUnits)} units
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 border-t border-slate-200 pt-4 text-sm text-emerald-700">
                All medicines meet the 30-day target.
              </p>
            )}
            <p className="mt-3 text-xs text-muted">
              Based on demo last-month usage. This is a planning suggestion, not
              an order placed through the backend.
            </p>
          </div>
        </>
      )}

      {isAdmin && isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={closeModal}
            aria-hidden="true"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="stock-modal-title"
            aria-describedby="stock-modal-description"
            className="relative w-full max-w-sm rounded-xl bg-white p-6 shadow-xl ring-1 ring-slate-200"
          >
            <h2
              id="stock-modal-title"
              className="text-lg font-semibold text-ink"
            >
              {isAdding ? 'Add stock' : 'Remove stock'}
            </h2>
            <p id="stock-modal-description" className="mt-1 text-sm text-muted">
              {isAdding
                ? 'Choose a medicine and enter the units received.'
                : 'Choose a medicine and enter the units issued or used.'}
            </p>

            <form onSubmit={handleSubmit} className="mt-5 space-y-5">
              <div>
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
                    setConfirmation('')
                    setQuantity('')
                  }}
                  disabled={formDisabled}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-ink focus:border-brand-600 focus:ring-2 focus:ring-brand-200 focus:outline-none disabled:bg-slate-100 disabled:text-muted"
                >
                  {isLoadingMedicines && (
                    <option value="">Loading medicines…</option>
                  )}
                  {!isLoadingMedicines && !hasMedicines && (
                    <option value="">No medicines yet</option>
                  )}
                  {medicines.map((item) => (
                    <option key={item.medicine} value={item.medicine}>
                      {item.medicine}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="modal-quantity"
                  className="block text-sm font-medium text-slate-700"
                >
                  {isAdding ? 'Units received' : 'Units to remove'}
                </label>
                <input
                  id="modal-quantity"
                  type="number"
                  min="1"
                  max={isAdding ? undefined : selectedItem?.quantity}
                  step="1"
                  inputMode="numeric"
                  placeholder={isAdding ? 'e.g. 50' : 'e.g. 10'}
                  value={quantity}
                  onChange={(event) => {
                    setQuantity(event.target.value)
                    setError('')
                    setConfirmation('')
                  }}
                  disabled={formDisabled}
                  aria-invalid={Boolean(error)}
                  aria-describedby={
                    error
                      ? 'modal-quantity-error'
                      : currentCover
                        ? previewQuantity !== null
                          ? 'stock-preview stock-cover'
                          : 'stock-cover'
                        : previewQuantity !== null
                          ? 'stock-preview'
                          : undefined
                  }
                  className="tabular-data mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-ink focus:border-brand-600 focus:ring-2 focus:ring-brand-200 focus:outline-none disabled:bg-slate-100 disabled:text-muted"
                />
                {isAdding && currentCover && currentCover.neededUnits > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setQuantity(String(currentCover.neededUnits))
                    }
                    className="mt-2 text-xs font-medium text-brand-700 underline decoration-brand-200 underline-offset-2 hover:decoration-brand-600 focus:ring-2 focus:ring-brand-200 focus:outline-none"
                  >
                    Use suggested {formatNumber(currentCover.neededUnits)} units
                  </button>
                )}
                {error && (
                  <p
                    id="modal-quantity-error"
                    role="alert"
                    className="mt-2 text-sm text-red-600"
                  >
                    {error}
                  </p>
                )}

                {previewQuantity !== null && selectedItem && (
                  <p
                    id="stock-preview"
                    className="mt-3 flex items-baseline justify-between gap-3 rounded-lg bg-canvas px-3 py-2 text-sm"
                  >
                    <span className="text-muted">
                      {isAdding ? 'Stock after entry' : 'Stock after removal'}
                    </span>
                    <span className="tabular-data font-medium text-ink">
                      {formatNumber(selectedItem.quantity)} →{' '}
                      {formatNumber(previewQuantity)} units
                    </span>
                  </p>
                )}

                {selectedItem && currentCover && (
                  <div
                    id="stock-cover"
                    className="mt-3 rounded-lg border border-slate-200 px-3 py-2.5"
                  >
                    <p className="text-xs font-medium text-muted">
                      Cover outlook · demo usage
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="text-xs text-muted">Now</span>
                      <CoverStatus info={currentCover} compact />
                      {afterCover && (
                        <>
                          <span aria-hidden="true" className="text-muted">
                            →
                          </span>
                          <span className="text-xs text-muted">After</span>
                          <CoverStatus info={afterCover} compact />
                        </>
                      )}
                    </div>
                    <p className="mt-2 text-[11px] text-muted">
                      Basis: {currentCover.basis}
                    </p>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting || formDisabled}
                className="w-full rounded-lg bg-brand-600 px-4 py-2 font-medium text-white transition-colors hover:bg-brand-700 focus:ring-2 focus:ring-brand-200 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
              >
                {isSubmitting
                  ? isAdding
                    ? 'Adding…'
                    : 'Removing…'
                  : isAdding
                    ? 'Add to stock'
                    : 'Remove from stock'}
              </button>

              {confirmation && (
                <p role="status" className="text-sm text-brand-800">
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
