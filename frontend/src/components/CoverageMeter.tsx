import { formatNumber } from '../lib/format'

type CoverageMeterProps = {
  current: number
  target: number
  shortfall: number
}

function CoverageMeter({ current, target, shortfall }: CoverageMeterProps) {
  const covered = target > 0 ? Math.min(current, target) / target : 1
  const short = target > 0 ? Math.min(shortfall, target) / target : 0
  const surplus = Math.max(0, current - target)

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-xs text-muted">
        <span>
          <span className="tabular-data font-medium text-ink">
            {formatNumber(current)}
          </span>{' '}
          on hand
        </span>
        <span>
          {shortfall > 0 ? (
            <>
              <span className="tabular-data font-medium text-signal-low">
                {formatNumber(shortfall)}
              </span>{' '}
              short
            </>
          ) : (
            <>
              <span className="tabular-data font-medium text-brand-800">
                {formatNumber(surplus)}
              </span>{' '}
              above target
            </>
          )}
        </span>
      </div>

      <div
        role="meter"
        aria-valuemin={0}
        aria-valuemax={target}
        aria-valuenow={Math.min(current, target)}
        aria-valuetext={`${formatNumber(current)} of ${formatNumber(target)} target units on hand`}
        className="mt-3 flex h-3 overflow-hidden rounded-full bg-slate-100"
      >
        <div className="h-full bg-brand-600/80" style={{ width: `${covered * 100}%` }} />
        <div className="h-full bg-amber-500/80" style={{ width: `${short * 100}%` }} />
      </div>

      <div className="mt-2 flex items-baseline justify-between text-xs text-muted">
        <span>Current stock</span>
        <span className="tabular-data">{formatNumber(target)} target</span>
      </div>
    </div>
  )
}

export default CoverageMeter
