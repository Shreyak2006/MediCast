import type { InventoryItem } from '../api/inventory'

type MedicineCardProps = {
  item: InventoryItem
}

function MedicineCard({ item }: MedicineCardProps) {
  return (
    <article className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <h2 className="text-sm font-medium text-slate-500">{item.medicine}</h2>
      <p className="mt-3 flex items-baseline gap-2">
        <span className="text-3xl font-semibold tracking-tight text-slate-900">
          {item.quantity}
        </span>
        <span className="text-sm text-slate-500">in stock</span>
      </p>
      {/* Future fields (predicted demand, reorder flag) can go here. */}
    </article>
  )
}

export default MedicineCard
