import { useState } from 'react'
import indiaMap from '@svg-maps/india'
import type { MonthOption } from '../data/demoAnalytics'
import { getStateCases } from '../data/demoAnalytics'
import { formatNumber } from '../lib/format'

type IndiaDengueMapProps = {
  month: MonthOption
  selectedState?: string
}

const SCALE = ['#eef6f4', '#d3e9e4', '#a6d2c9', '#6eb2a5', '#0f766e']

function fillFor(cases: number, max: number) {
  const ratio = max > 0 ? cases / max : 0
  if (ratio >= 0.75) return SCALE[4]
  if (ratio >= 0.5) return SCALE[3]
  if (ratio >= 0.3) return SCALE[2]
  if (ratio >= 0.12) return SCALE[1]
  return SCALE[0]
}

function IndiaDengueMap({ month, selectedState }: IndiaDengueMapProps) {
  const data = getStateCases(month.key)
  const casesByState = new Map(data.map((item) => [item.state, item.cases]))
  const max = Math.max(...data.map((item) => item.cases), 1)
  const top = [...data].sort((a, b) => b.cases - a.cases).slice(0, 5)
  const [activeState, setActiveState] = useState(
    selectedState && casesByState.has(selectedState)
      ? selectedState
      : top[0]?.state,
  )

  const activeCases = activeState ? (casesByState.get(activeState) ?? 0) : 0

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted">Demo data</p>
          <h3 className="mt-1 text-base font-semibold text-ink">
            Dengue signal across India
          </h3>
          <p className="mt-1 text-xs text-muted">{month.fullLabel}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted">Highest</p>
          <p className="tabular-data mt-1 text-sm font-medium text-ink">
            {top[0]?.state ?? '—'} · {formatNumber(top[0]?.cases ?? 0)}
          </p>
        </div>
      </div>

      <div className="mt-3 grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(150px,0.45fr)] sm:items-start">
        <div className="mx-auto w-full max-w-[340px]">
          <svg
            viewBox={indiaMap.viewBox}
            role="img"
            aria-label={`Demo dengue cases by state for ${month.fullLabel}`}
            className="h-auto w-full"
          >
            {indiaMap.locations.map((location) => {
              const cases = casesByState.get(location.name) ?? 0
              const isSelected = location.name === selectedState
              const isActive = location.name === activeState

              return (
                <path
                  key={location.id}
                  d={location.path}
                  fill={fillFor(cases, max)}
                  stroke={isSelected || isActive ? '#b45309' : '#ffffff'}
                  strokeWidth={isSelected || isActive ? 2.4 : 0.8}
                  tabIndex={0}
                  role="button"
                  aria-label={`${location.name}: ${formatNumber(cases)} demo cases`}
                  className="cursor-pointer outline-none transition-[stroke-width,fill] focus-visible:stroke-[#b45309] motion-reduce:transition-none"
                  onMouseEnter={() => setActiveState(location.name)}
                  onFocus={() => setActiveState(location.name)}
                  onClick={() => setActiveState(location.name)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      setActiveState(location.name)
                    }
                  }}
                >
                  <title>{`${location.name}: ${formatNumber(cases)} demo cases`}</title>
                </path>
              )
            })}
          </svg>
        </div>

        <div>
          <p className="text-xs font-medium text-muted">Top states</p>
          <ol className="mt-2 space-y-1.5">
            {top.map((item, index) => (
              <li key={item.state}>
                <button
                  type="button"
                  onClick={() => setActiveState(item.state)}
                  className={`flex w-full items-baseline justify-between gap-2 rounded px-1.5 py-1 text-left text-xs transition-colors focus:ring-2 focus:ring-brand-200 focus:outline-none motion-reduce:transition-none ${
                    activeState === item.state
                      ? 'bg-brand-50 text-brand-800'
                      : 'text-ink hover:bg-canvas'
                  }`}
                >
                  <span className="flex min-w-0 items-baseline gap-1.5">
                    <span className="tabular-data w-3 text-muted">{index + 1}</span>
                    <span className="truncate">{item.state}</span>
                  </span>
                  <span className="tabular-data font-medium">
                    {formatNumber(item.cases)}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3">
        <div className="flex items-center gap-2 text-xs text-muted">
          <span>Low</span>
          <span className="flex" aria-hidden="true">
            {SCALE.map((color) => (
              <span
                key={color}
                className="h-2.5 w-5 first:rounded-l-sm last:rounded-r-sm"
                style={{ backgroundColor: color }}
              />
            ))}
          </span>
          <span>High</span>
        </div>
        <p className="tabular-data text-xs text-ink">
          {activeState ?? '—'}: {formatNumber(activeCases)} demo cases
        </p>
      </div>

      <p className="mt-2 text-[11px] text-muted">
        Demo data for planning only. Outlines:{' '}
        <a
          href="https://mapsvg.com/maps/india"
          target="_blank"
          rel="noreferrer"
          className="underline decoration-slate-300 underline-offset-2 hover:text-ink"
        >
          MapSVG
        </a>
        , CC BY 4.0.
      </p>
    </div>
  )
}

export default IndiaDengueMap
