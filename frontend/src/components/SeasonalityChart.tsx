import { useMemo, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { getRecentMonths, getSeasonality } from '../data/demoAnalytics'
import { formatNumber } from '../lib/format'

type SeasonalityChartProps = {
  state?: string
}

function SeasonalityChart({ state }: SeasonalityChartProps) {
  const months = useMemo(() => getRecentMonths(12), [])
  const [selectedKey, setSelectedKey] = useState(months[months.length - 1].key)
  const series = useMemo(() => getSeasonality(state, months), [state, months])
  const selected = months.find((month) => month.key === selectedKey) ?? months[months.length - 1]
  const selectedValue =
    series.points.find((point) => point.key === selectedKey)?.cases ?? 0

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted">Demo data</p>
          <h2 className="mt-1 text-lg font-semibold text-ink">
            Dengue seasonality · {series.label}
          </h2>
          <p className="mt-1 text-xs text-muted">
            Synthetic monthly pattern for planning, not live case reporting.
          </p>
        </div>
        <label className="text-xs text-muted">
          <span className="sr-only">Highlight month</span>
          <select
            value={selectedKey}
            onChange={(event) => setSelectedKey(event.target.value)}
            className="tabular-data mt-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-ink focus:border-brand-600 focus:ring-2 focus:ring-brand-200 focus:outline-none"
          >
            {months.map((month) => (
              <option key={month.key} value={month.key}>
                {month.fullLabel}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series.points} margin={{ top: 12, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 5" />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#5b6b68', fontSize: 11 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#5b6b68', fontSize: 11 }}
              width={52}
              tickFormatter={(value) => formatNumber(Number(value))}
            />
            <Tooltip
              formatter={(value) => [
                `${formatNumber(Number(value))} demo cases`,
                'Seasonal baseline',
              ]}
              contentStyle={{
                borderRadius: 10,
                border: '1px solid #e2e8f0',
                fontSize: 12,
                boxShadow: '0 8px 24px rgba(16, 42, 39, 0.08)',
              }}
            />
            <ReferenceLine
              x={selected.label}
              stroke="#b45309"
              strokeDasharray="4 4"
              strokeWidth={1.5}
            />
            <Line
              type="monotone"
              dataKey="cases"
              stroke="#0f766e"
              strokeWidth={2.5}
              dot={{ r: 2.5, fill: '#0f766e', strokeWidth: 0 }}
              activeDot={{ r: 5, fill: '#b45309', stroke: '#ffffff', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2 border-t border-slate-200 pt-3">
        <p className="text-xs text-muted">
          {selected.fullLabel} · highlighted month
        </p>
        <p className="tabular-data text-sm font-medium text-ink">
          {formatNumber(selectedValue)} demo cases
        </p>
      </div>
    </div>
  )
}

export default SeasonalityChart
