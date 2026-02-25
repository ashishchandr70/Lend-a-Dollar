import type { AppState, Decision } from './types'

const STORAGE_KEY = 'lend-a-dollar-mvp'

export const formatCurrency = (value: number) =>
  value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  })

export const formatPercent = (value: number) => `${value.toFixed(1)}%`

export const generateId = (prefix: string) =>
  `${prefix}-${Math.random().toString(36).slice(2, 10)}`

export const calculateMonthlyPayment = (amount: number, months: number) =>
  Math.max(1, Math.round(amount / Math.max(1, months)))

export const simulateUnderwriting = (
  amount: number,
  monthlyIncome: number,
  docsCount: number,
): { score: number; decision: Decision; flags: string[] } => {
  const incomeCoverage = monthlyIncome / Math.max(1, amount / 12)
  const docBonus = Math.min(15, docsCount * 5)
  const score = Math.max(
    20,
    Math.min(100, Math.round(55 + incomeCoverage * 8 + docBonus)),
  )

  const flags: string[] = []
  if (docsCount < 2) flags.push('Low documentation')
  if (amount > monthlyIncome * 3) flags.push('High amount-to-income')

  let decision: Decision = 'review'
  if (score >= 80 && flags.length === 0) decision = 'approve'
  if (score < 60) decision = 'decline'

  return { score, decision, flags }
}

const mergeState = (fallback: AppState, stored: Partial<AppState>): AppState => ({
  ...fallback,
  ...stored,
  applications: Array.isArray(stored.applications)
    ? stored.applications
    : fallback.applications,
  loans: Array.isArray(stored.loans) ? stored.loans : fallback.loans,
  proposals: Array.isArray(stored.proposals)
    ? stored.proposals
    : fallback.proposals,
  audit: Array.isArray(stored.audit) ? stored.audit : fallback.audit,
  lender: {
    ...fallback.lender,
    ...(stored.lender ?? {}),
  },
  platformPaused:
    typeof stored.platformPaused === 'boolean'
      ? stored.platformPaused
      : fallback.platformPaused,
})

export const loadState = (fallback: AppState): AppState => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return fallback
    const parsed = JSON.parse(stored) as Partial<AppState>
    return mergeState(fallback, parsed)
  } catch {
    return fallback
  }
}

export const saveState = (state: AppState) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export const clearState = () => {
  localStorage.removeItem(STORAGE_KEY)
}
