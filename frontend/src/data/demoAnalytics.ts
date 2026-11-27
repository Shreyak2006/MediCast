/**
 * Frontend-only demo data. Nothing here is fetched from the backend; replace
 * this module when real usage / surveillance feeds are available.
 */

export type MonthOption = {
  key: string
  label: string
  fullLabel: string
}

export type MedicineUsePoint = {
  medicine: string
  units: number
  previous: number
  change: number
}

export type StateCasePoint = {
  state: string
  id: string
  cases: number
}

export type SeasonPoint = MonthOption & {
  cases: number
}

export type SeasonalitySeries = {
  label: string
  points: SeasonPoint[]
}

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

// Synthetic seasonal shape: a monsoon peak and a smaller spring bump.
const MONTH_FACTORS = [0.72, 0.66, 0.82, 1.02, 1.24, 1.48, 1.82, 2.08, 1.72, 1.26, 0.92, 0.76]

const MEDICINE_PATTERNS: Record<string, number[]> = {
  'TB medicines': [96, 108, 101, 118, 112, 124, 116, 130, 122, 128, 119, 126],
  'Dengue medicines': [44, 38, 52, 70, 96, 132, 168, 184, 152, 114, 78, 56],
}

const STATES: { name: string; id: string; baseline: number }[] = [
  { name: 'Andaman and Nicobar Islands', id: 'an', baseline: 10 },
  { name: 'Andhra Pradesh', id: 'ap', baseline: 380 },
  { name: 'Arunachal Pradesh', id: 'ar', baseline: 25 },
  { name: 'Assam', id: 'as', baseline: 160 },
  { name: 'Bihar', id: 'br', baseline: 190 },
  { name: 'Chandigarh', id: 'ch', baseline: 45 },
  { name: 'Chhattisgarh', id: 'ct', baseline: 110 },
  { name: 'Dadra and Nagar Haveli', id: 'dn', baseline: 18 },
  { name: 'Daman and Diu', id: 'dd', baseline: 12 },
  { name: 'Delhi', id: 'dl', baseline: 220 },
  { name: 'Goa', id: 'ga', baseline: 55 },
  { name: 'Gujarat', id: 'gj', baseline: 280 },
  { name: 'Haryana', id: 'hr', baseline: 120 },
  { name: 'Himachal Pradesh', id: 'hp', baseline: 60 },
  { name: 'Jammu and Kashmir', id: 'jk', baseline: 80 },
  { name: 'Jharkhand', id: 'jh', baseline: 100 },
  { name: 'Karnataka', id: 'ka', baseline: 430 },
  { name: 'Kerala', id: 'kl', baseline: 540 },
  { name: 'Lakshadweep', id: 'ld', baseline: 8 },
  { name: 'Madhya Pradesh', id: 'mp', baseline: 210 },
  { name: 'Maharashtra', id: 'mh', baseline: 620 },
  { name: 'Manipur', id: 'mn', baseline: 40 },
  { name: 'Meghalaya', id: 'ml', baseline: 38 },
  { name: 'Mizoram', id: 'mz', baseline: 30 },
  { name: 'Nagaland', id: 'nl', baseline: 30 },
  { name: 'Odisha', id: 'or', baseline: 180 },
  { name: 'Puducherry', id: 'py', baseline: 50 },
  { name: 'Punjab', id: 'pb', baseline: 130 },
  { name: 'Rajasthan', id: 'rj', baseline: 240 },
  { name: 'Sikkim', id: 'sk', baseline: 25 },
  { name: 'Tamil Nadu', id: 'tn', baseline: 500 },
  { name: 'Telangana', id: 'tg', baseline: 350 },
  { name: 'Tripura', id: 'tr', baseline: 45 },
  { name: 'Uttar Pradesh', id: 'up', baseline: 320 },
  { name: 'Uttarakhand', id: 'ut', baseline: 60 },
  { name: 'West Bengal', id: 'wb', baseline: 400 },
]

const STATE_ALIASES: Record<string, string> = {
  orissa: 'Odisha',
  'nct of delhi': 'Delhi',
  'delhi nct': 'Delhi',
  'jammu & kashmir': 'Jammu and Kashmir',
  'andaman & nicobar islands': 'Andaman and Nicobar Islands',
  'dadra & nagar haveli': 'Dadra and Nagar Haveli',
  'daman & diu': 'Daman and Diu',
}

const AVERAGE_BASELINE =
  STATES.reduce((sum, state) => sum + state.baseline, 0) / STATES.length

function padMonth(month: number) {
  return String(month).padStart(2, '0')
}

function monthIndex(key: string) {
  const index = Number(key.slice(5, 7)) - 1
  return Number.isFinite(index) ? Math.min(11, Math.max(0, index)) : 9
}

function yearNumber(key: string) {
  const year = Number(key.slice(0, 4))
  return Number.isFinite(year) ? year : new Date().getFullYear()
}

function makeMonthKey(year: number, monthIndexValue: number) {
  const date = new Date(year, monthIndexValue, 1)
  return `${date.getFullYear()}-${padMonth(date.getMonth() + 1)}`
}

export function getRecentMonths(count = 12): MonthOption[] {
  const today = new Date()
  const lastFullMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)

  return Array.from({ length: count }, (_, index) => {
    const date = new Date(
      lastFullMonth.getFullYear(),
      lastFullMonth.getMonth() - count + 1 + index,
      1,
    )
    const month = date.getMonth()

    return {
      key: `${date.getFullYear()}-${padMonth(month + 1)}`,
      label: MONTH_LABELS[month],
      fullLabel: `${MONTH_LABELS[month]} ${date.getFullYear()}`,
    }
  })
}

function generatedPattern(medicine: string) {
  let hash = 0
  for (const character of medicine) {
    hash = (hash * 31 + character.charCodeAt(0)) % 997
  }

  return MONTH_FACTORS.map(
    (factor, index) => Math.round((42 + ((hash + index * 23) % 70)) * factor),
  )
}

export function getMedicineUse(
  monthKey: string,
  medicines?: string[],
): MedicineUsePoint[] {
  const names = medicines?.length ? medicines : Object.keys(MEDICINE_PATTERNS)
  const previousKey = makeMonthKey(
    yearNumber(monthKey),
    monthIndex(monthKey) - 1,
  )

  return names.map((medicine) => {
    const pattern = MEDICINE_PATTERNS[medicine] ?? generatedPattern(medicine)
    const units = pattern[monthIndex(monthKey)]
    const previous = pattern[monthIndex(previousKey)]
    const change = previous > 0 ? ((units - previous) / previous) * 100 : 0

    return { medicine, units, previous, change }
  })
}

export function getStateCases(monthKey: string): StateCasePoint[] {
  const yearFactor = 1 + (yearNumber(monthKey) - 2026) * 0.03
  const factor = MONTH_FACTORS[monthIndex(monthKey)] * yearFactor

  return STATES.map((state) => ({
    state: state.name,
    id: state.id,
    cases: Math.round(state.baseline * factor),
  }))
}

export function getSeasonality(
  stateName?: string,
  months = getRecentMonths(12),
): SeasonalitySeries {
  const normalized = stateName?.trim().toLowerCase() ?? ''
  const alias = STATE_ALIASES[normalized] ?? stateName?.trim()
  const match = STATES.find(
    (state) => state.name.toLowerCase() === alias?.toLowerCase(),
  )
  const casesFor = (monthKey: string) => {
    if (!match) {
      return Math.round(AVERAGE_BASELINE * MONTH_FACTORS[monthIndex(monthKey)])
    }
    return (
      getStateCases(monthKey).find((item) => item.state === match.name)
        ?.cases ?? Math.round(match.baseline * MONTH_FACTORS[monthIndex(monthKey)])
    )
  }

  return {
    label: match?.name ?? 'All India (demo average)',
    points: months.map((month) => ({ ...month, cases: casesFor(month.key) })),
  }
}
