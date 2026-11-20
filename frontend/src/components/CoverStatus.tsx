import type { CoverInfo, CoverLevel } from '../lib/cover'

type CoverStatusProps = {
  info: CoverInfo
  compact?: boolean
}

const TONES: Record<CoverLevel, string> = {
  good: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  watch: 'bg-amber-50 text-amber-800 ring-amber-200',
  critical: 'bg-red-50 text-red-700 ring-red-200',
  unknown: 'bg-slate-100 text-slate-700 ring-slate-200',
}

function CoverStatus({ info, compact = false }: CoverStatusProps) {
  return (
    <div className="flex min-w-0 flex-col items-start gap-1">
      <span
        className={`inline-flex max-w-full rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${TONES[info.level]}`}
      >
        <span className="truncate">{info.title}</span>
      </span>
      <span
        className={`tabular-data text-muted ${compact ? 'text-[11px]' : 'text-xs'}`}
      >
        {info.detail}
      </span>
    </div>
  )
}

export default CoverStatus
