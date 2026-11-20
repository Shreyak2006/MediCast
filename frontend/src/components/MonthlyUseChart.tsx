import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { MonthOption } from '../data/demoAnalytics'
import { getMedicineUse } from '../data/demoAnalytics'
import { formatNumber, formatPercent } from '../lib/format'

type MonthlyUseChartProps = {
  month: MonthOption
  medicines: string[]
}

const COLORS = ['#0f766e', '#b45309']

function formatChange(change: number) {
  if (Math.abs(change) < 0.5) return 'No change'
  return `${change > 0 ? '+' : '−'}${formatPercent(Math.abs(change), 0)}`
}

function MonthlyUseChart({ month, medicines }: MonthlyUseChartProps) {
  const data = getMedicineUse(month.key, medicines)

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted">Demo data</p>
          <h3 className="mt-1 text-base font-semibold text-ink">
            Medicine use · {month.fullLabel}
          </h3>
        </div>
        <span className="mt-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-800 ring-1 ring-inset ring-brand-100">
          Last month
        </span>
      </div>

      <div className="mt-4 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 24, right: 8, left: -18, bottom: 0 }}>
            <XAxis
              dataKey="medicine"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#5b6b68', fontSize: 12 }}
              interval={0}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#5b6b68', fontSize: 11 }}
              width={48}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ fill: '#f5f7f6' }}
              formatter={(value) => [
                `${formatNumber(Number(value))} units`,
                'Used',
              ]}
              contentStyle={{
                borderRadius: 10,
                border: '1px solid #e2e8f0',
                fontSize: 12,
                boxShadow: '0 8px 24px rgba(16, 42, 39, 0.08)',
              }}
            />
            <Bar dataKey="units" radius={[6, 6, 0, 0]} maxBarSize={72}>
              {data.map((entry, index) => (
                <Cell key={entry.medicine} fill={COLORS[index % COLORS.length]} />
              ))}
              <LabelList
                dataKey="units"
                position="top"
                formatter={(value) => formatNumber(Number(value))}
                style={{ fill: '#102a27', fontSize: 12, fontWeight: 600 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <ul className="mt-4 space-y-2 border-t border-slate-200 pt-4 text-sm">
        {data.map((item, index) => (
          <li key={item.medicine} className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2 text-ink">
              <span
                aria-hidden="true"
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="truncate">{item.medicine}</span>
            </span>
            <span className="tabular-data shrink-0 text-muted">
              {formatNumber(item.units)} units · {formatChange(item.change)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default MonthlyUseChart
