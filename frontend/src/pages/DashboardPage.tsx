import { useEffect, useState } from 'react'
import { getInventory } from '../api/inventory'
import type { InventoryItem } from '../api/inventory'
import MedicineCard from '../components/MedicineCard'

function DashboardPage() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

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

  return (
    <section>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
        Dashboard
      </h1>
      <p className="mt-1 text-slate-600">
        Current stock levels for tracked medicines.
      </p>

      {isLoading && <p className="mt-6 text-slate-600">Loading inventory…</p>}

      {!isLoading && error && (
        <p
          role="alert"
          className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200"
        >
          {error}
        </p>
      )}

      {!isLoading && !error && items.length === 0 && (
        <p className="mt-6 text-slate-600">No inventory data yet.</p>
      )}

      {!isLoading && !error && items.length > 0 && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {items.map((item) => (
            <MedicineCard key={item.medicine} item={item} />
          ))}
        </div>
      )}
    </section>
  )
}

export default DashboardPage
