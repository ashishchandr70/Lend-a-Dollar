export type Decision = 'approve' | 'review' | 'decline'
export type ApplicationStatus =
  | 'submitted'
  | 'approved'
  | 'denied'
  | 'written-off'
  | 'appealed'

export interface BorrowerApplication {
  id: string
  name: string
  state: string
  amount: number
  purpose: string
  monthlyIncome: number
  docs: string[]
  aiScore: number
  aiDecision: Decision
  status: ApplicationStatus
  createdAt: string
  appealNote?: string
}

export interface Loan {
  id: string
  applicationId: string
  borrowerName: string
  principal: number
  balance: number
  interestRate: number
  termMonths: number
  monthlyPayment: number
  status: 'active' | 'paid' | 'written-off'
}

export interface LenderState {
  name: string
  monthlyContribution: number
  totalDeposits: number
  lendingAllocation: number
  yieldAllocation: number
  maxExposure: number
}

export interface Proposal {
  id: string
  title: string
  description: string
  status: 'open' | 'closed'
  votesFor: number
  votesAgainst: number
}

export interface AuditEvent {
  id: string
  at: string
  actor: string
  action: string
  detail: string
}

export interface AppState {
  applications: BorrowerApplication[]
  loans: Loan[]
  lender: LenderState
  proposals: Proposal[]
  audit: AuditEvent[]
  platformPaused: boolean
}
