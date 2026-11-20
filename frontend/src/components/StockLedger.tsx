import type { InventoryItem } from '../api/inventory'
import { getCoverInfo } from '../lib/cover'
import { formatNumber, formatPercent } from '../lib/format'
import CoverStatus from './CoverStatus'

export type StockAction = 'add' | 'remove'

type StockLedgerProps = {
  items: InventoryItem[]
  emptyMessage?: string
  onAction?: (medicine: string, action: StockAction) => void
  showCoverage?: boolean
}

function ShareBar({ share }: { share: number }) {
  return (
    <div
      aria-hidden="true"
      className="h-1.5 min-w-8 flex-1 overflow-hidden rounded-sm bg-slate-100"
    >
      <div
        className="h-full rounded-sm bg-brand-500"
        style={{ width: `${share}%` }}
      />
    </div>
  )
}

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-3.5 w-3.5"
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
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <path strokeLinecap="round" d="M4 10h12" />
    </svg>
  )
}

function MedicineButton({
  medicine,
  onAction,
}: {
  medicine: string
  onAction?: (medicine: string, action: StockAction) => void
}) {
  if (!onAction) {
    return <span>{medicine}</span>
  }

  return (
    <button
      type="button"
      onClick={() => onAction(medicine, 'add')}
      aria-label={`Add stock for ${medicine}`}
      className="rounded text-left font-medium text-brand-800 underline decoration-brand-200 underline-offset-4 transition-colors hover:decoration-brand-600 focus:ring-2 focus:ring-brand-200 focus:outline-none motion-reduce:transition-none"
    >
      {medicine}
    </button>
  )
}

function ActionButton({
  medicine,
  action,
  onAction,
}: {
  medicine: string
  action: StockAction
  onAction: (medicine: string, action: StockAction) => void
}) {
  const label = action === 'add' ? 'Add' : 'Remove'

  return (
    <button
      type="button"
      onClick={() => onAction(medicine, action)}
      aria-label={`${label} stock for ${medicine}`}
      className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 focus:ring-2 focus:ring-brand-200 focus:outline-none motion-reduce:transition-none"
    >
      {action === 'add' ? <PlusIcon /> : <MinusIcon />} {label}
    </button>
  )
}

function StockLedger({
  items,
  emptyMessage = 'No medicines yet',
  onAction,
  showCoverage = false,
}: StockLedgerProps) {
  const total = items.reduce((sum, item) => sum + item.quantity, 0)

  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-slate-200 bg-white px-4 py-5 text-sm text-muted">
        {emptyMessage}
      </p>
    )
  }

  return (
    <>
      <div className="hidden overflow-hidden rounded-lg border border-slate-200 bg-white sm:block">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium text-muted">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">
                Medicine
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium">
                On hand
              </th>
              {showCoverage && (
                <th scope="col" className="px-4 py-3 font-medium">
                  Cover estimate
                </th>
              )}
              <th scope="col" className="px-4 py-3 font-medium">
                Share of tracked stock
              </th>
              {onAction && (
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {items.map((item) => {
              const share = total > 0 ? (item.quantity / total) * 100 : 0

              return (
                <tr key={item.medicine}>
                  <td className="px-4 py-3 font-medium text-ink">
                    <MedicineButton medicine={item.medicine} onAction={onAction} />
                  </td>
                  <td className="tabular-data px-4 py-3 text-right text-ink">
                    {formatNumber(item.quantity)}
                  </td>
                  {showCoverage && (
                    <td className="px-4 py-3">
                      <CoverStatus info={getCoverInfo(item.medicine, item.quantity)} />
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <ShareBar share={share} />
                      <span className="tabular-data w-10 text-right text-xs text-muted">
                        {formatPercent(share)}
                      </span>
                    </div>
                  </td>
                  {onAction && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <ActionButton
                          medicine={item.medicine}
                          action="add"
                          onAction={onAction}
                        />
                        <ActionButton
                          medicine={item.medicine}
                          action="remove"
                          onAction={onAction}
                        />
                      </div>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white sm:hidden">
        {items.map((item) => {
          const share = total > 0 ? (item.quantity / total) * 100 : 0

          return (
            <li key={item.medicine} className="px-4 py-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-medium text-ink">
                  <MedicineButton medicine={item.medicine} onAction={onAction} />
                </span>
                <span className="tabular-data text-sm font-medium text-ink">
                  {formatNumber(item.quantity)}
                  <span className="ml-1 text-xs font-normal text-muted">units</span>
                </span>
              </div>
              <div className="mt-2 flex items-center gap-3">
                <ShareBar share={share} />
                <span className="tabular-data w-10 text-right text-xs text-muted">
                  {formatPercent(share)}
                </span>
              </div>
              {(showCoverage || onAction) && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                  {showCoverage ? (
                    <CoverStatus info={getCoverInfo(item.medicine, item.quantity)} />
                  ) : (
                    <span />
                  )}
                  {onAction && (
                    <div className="flex gap-2">
                      <ActionButton
                        medicine={item.medicine}
                        action="add"
                        onAction={onAction}
                      />
                      <ActionButton
                        medicine={item.medicine}
                        action="remove"
                        onAction={onAction}
                      />
                    </div>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </>
  )
}

export default StockLedger
