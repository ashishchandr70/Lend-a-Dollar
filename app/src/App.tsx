import { useMemo, useState, useEffect } from 'react'
import './App.css'
import { createDefaultState, DOC_OPTIONS, PURPOSE_OPTIONS, US_STATES } from './data'
import type { AppState, BorrowerApplication, Loan, Proposal } from './types'
import {
  calculateMonthlyPayment,
  clearState,
  formatCurrency,
  formatPercent,
  generateId,
  loadState,
  saveState,
  simulateUnderwriting,
} from './utils'

type ViewId = 'home' | 'borrower' | 'lender' | 'admin' | 'governance' | 'transparency'

const LENDING_ALLOCATION = 70
const YIELD_ALLOCATION = 30
const YIELD_RATE = 0.05

const NAV_ITEMS: { id: ViewId; label: string }[] = [
  { id: 'home', label: 'Overview' },
  { id: 'borrower', label: 'Borrower' },
  { id: 'lender', label: 'Lender' },
  { id: 'admin', label: 'Admin' },
  { id: 'governance', label: 'Governance' },
  { id: 'transparency', label: 'Transparency' },
]

const defaultState = createDefaultState()

const buildLoanFromApplication = (application: BorrowerApplication): Loan => {
  const termMonths = 12
  return {
    id: generateId('loan'),
    applicationId: application.id,
    borrowerName: application.name,
    principal: application.amount,
    balance: application.amount,
    interestRate: 2.4,
    termMonths,
    monthlyPayment: calculateMonthlyPayment(application.amount, termMonths),
    status: 'active',
  }
}

function App() {
  const [view, setView] = useState<ViewId>('home')
  const [state, setState] = useState<AppState>(() => loadState(defaultState))
  const [scenario, setScenario] = useState({
    totalContributions: state.lender.totalDeposits,
    borrowedRate: 85,
  })
  const [borrowerForm, setBorrowerForm] = useState({
    name: '',
    state: 'TX',
    amount: 600,
    purpose: PURPOSE_OPTIONS[0],
    monthlyIncome: 2000,
    docs: [] as string[],
  })
  const [appealNotes, setAppealNotes] = useState<Record<string, string>>({})

  useEffect(() => {
    saveState(state)
  }, [state])

  const updateState = (updater: (prev: AppState) => AppState) => {
    setState((prev) => updater(prev))
  }

  const addAudit = (next: AppState, actor: string, action: string, detail: string) => ({
    ...next,
    audit: [
      {
        id: generateId('audit'),
        at: new Date().toISOString(),
        actor,
        action,
        detail,
      },
      ...next.audit,
    ].slice(0, 25),
  })

  const stats = useMemo(() => {
    const totalLoans = state.loans.length
    const activeLoans = state.loans.filter((loan) => loan.status === 'active')
    const writtenOff = state.loans.filter((loan) => loan.status === 'written-off')
    const portfolioPrincipal = state.loans.reduce((sum, loan) => sum + loan.principal, 0)
    const portfolioBalance = state.loans.reduce((sum, loan) => sum + loan.balance, 0)
    const portfolioWriteoffs = writtenOff.reduce((sum, loan) => sum + loan.principal, 0)
    const portfolioDefaultRate = portfolioPrincipal
      ? (portfolioWriteoffs / portfolioPrincipal) * 100
      : 0
    const portfolioOutstandingRate = portfolioPrincipal
      ? portfolioBalance / portfolioPrincipal
      : 0.85
    const portfolioRepaymentRate = Math.max(
      0,
      1 - portfolioOutstandingRate - portfolioDefaultRate / 100,
    )
    const totalContributions = Math.max(0, scenario.totalContributions)
    const availableToBorrow = (totalContributions * LENDING_ALLOCATION) / 100
    const yieldSleeve = (totalContributions * YIELD_ALLOCATION) / 100
    const yieldIncome = yieldSleeve * YIELD_RATE
    const totalPrincipal = (availableToBorrow * scenario.borrowedRate) / 100
    const totalBalance = totalPrincipal * portfolioOutstandingRate
    const totalWriteoffs = totalPrincipal * (portfolioDefaultRate / 100)
    const defaultRate = totalPrincipal ? (totalWriteoffs / totalPrincipal) * 100 : 0
    const platformOps = yieldIncome * 0.5
    const lenderIncentives = yieldIncome * 0.3
    const resilienceReserve = yieldIncome * 0.2
    const lenderTotalLending =
      (state.lender.totalDeposits * LENDING_ALLOCATION) / 100
    const lenderWriteoffShare = lenderTotalLending * (defaultRate / 100)
    const lenderRepayments = lenderTotalLending * portfolioRepaymentRate
    const lenderCurrentBalance = Math.max(
      0,
      lenderTotalLending - lenderWriteoffShare - lenderRepayments,
    )

    return {
      totalLoans,
      activeLoans,
      totalPrincipal,
      totalBalance,
      totalWriteoffs,
      defaultRate,
      totalContributions,
      availableToBorrow,
      yieldSleeve,
      yieldIncome,
      platformOps,
      lenderIncentives,
      resilienceReserve,
      lenderTotalLending,
      lenderWriteoffShare,
      lenderRepayments,
      lenderCurrentBalance,
    }
  }, [scenario.borrowedRate, scenario.totalContributions, state])

  const handleBorrowerSubmit = () => {
    if (state.platformPaused) return

    const { score, decision } = simulateUnderwriting(
      borrowerForm.amount,
      borrowerForm.monthlyIncome,
      borrowerForm.docs.length,
    )
    const application: BorrowerApplication = {
      id: generateId('app'),
      name: borrowerForm.name.trim() || 'Anonymous Borrower',
      state: borrowerForm.state,
      amount: borrowerForm.amount,
      purpose: borrowerForm.purpose,
      monthlyIncome: borrowerForm.monthlyIncome,
      docs: borrowerForm.docs,
      aiScore: score,
      aiDecision: decision,
      status: decision === 'decline' ? 'denied' : 'submitted',
      createdAt: new Date().toISOString(),
    }

    updateState((prev) => {
      let next: AppState = {
        ...prev,
        applications: [application, ...prev.applications],
      }

      if (decision === 'approve') {
        const loan = buildLoanFromApplication(application)
        application.status = 'approved'
        next = {
          ...next,
          loans: [loan, ...next.loans],
        }
      }

      return addAudit(
        next,
        'Borrower',
        'Application submitted',
        `${application.name} requested ${formatCurrency(application.amount)}.`,
      )
    })

    setBorrowerForm({
      name: '',
      state: 'TX',
      amount: 600,
      purpose: PURPOSE_OPTIONS[0],
      monthlyIncome: 2000,
      docs: [],
    })
    setView('borrower')
  }

  const handleAppeal = (applicationId: string, note: string) => {
    updateState((prev) => {
      const updated: BorrowerApplication[] = prev.applications.map((app) =>
        app.id === applicationId
          ? { ...app, status: 'appealed', appealNote: note }
          : app,
      )
      return addAudit(
        { ...prev, applications: updated },
        'Borrower',
        'Appeal submitted',
        `Appeal submitted for ${applicationId}.`,
      )
    })
    setAppealNotes((prev) => {
      const next = { ...prev }
      delete next[applicationId]
      return next
    })
  }

  const handleAdminDecision = (
    applicationId: string,
    status: 'approved' | 'denied',
  ) => {
    updateState((prev) => {
      const applications: BorrowerApplication[] = prev.applications.map((app) =>
        app.id === applicationId ? { ...app, status } : app,
      )

      let loans = prev.loans
      const approvedApp = prev.applications.find(
        (app) => app.id === applicationId,
      )
      const alreadyLoaned = prev.loans.some(
        (loan) => loan.applicationId === applicationId,
      )

      if (status === 'approved' && approvedApp && !alreadyLoaned) {
        loans = [buildLoanFromApplication(approvedApp), ...loans]
      }

      return addAudit(
        { ...prev, applications, loans },
        'Admin',
        `Application ${status}`,
        `${applicationId} marked ${status}.`,
      )
    })
  }

  const handleWriteOff = (loanId: string) => {
    updateState((prev) => {
      const loans: Loan[] = prev.loans.map((loan) =>
        loan.id === loanId ? { ...loan, balance: 0, status: 'written-off' } : loan,
      )
      const loan = prev.loans.find((item) => item.id === loanId)
      const applications: BorrowerApplication[] = loan
        ? prev.applications.map((app) =>
            app.id === loan.applicationId ? { ...app, status: 'written-off' } : app,
          )
        : prev.applications

      return addAudit(
        { ...prev, loans, applications },
        'Admin',
        'Loan written off',
        `${loanId} written off to preserve dignity.`,
      )
    })
  }

  const handlePayment = (loanId: string) => {
    updateState((prev) => {
      const loans: Loan[] = prev.loans.map((loan) => {
        if (loan.id !== loanId || loan.status !== 'active') return loan
        const nextBalance = Math.max(0, loan.balance - loan.monthlyPayment)
        return {
          ...loan,
          balance: nextBalance,
          status: nextBalance === 0 ? 'paid' : loan.status,
        }
      })

      return addAudit(
        { ...prev, loans },
        'System',
        'Repayment simulated',
        `${loanId} payment posted.`,
      )
    })
  }

  const handleLenderUpdate = (payload: Partial<AppState['lender']>) => {
    updateState((prev) => {
      const lender = { ...prev.lender, ...payload }
      return addAudit(
        { ...prev, lender },
        'Lender',
        'Profile updated',
        'Lender allocations updated.',
      )
    })
  }

  const handleDeposit = (amount: number) => {
    updateState((prev) => {
      const lender = {
        ...prev.lender,
        totalDeposits: prev.lender.totalDeposits + amount,
      }
      return addAudit(
        { ...prev, lender },
        'Lender',
        'Deposit recorded',
        `${formatCurrency(amount)} added to the pool.`,
      )
    })
  }

  const handleVote = (proposal: Proposal, direction: 'for' | 'against') => {
    updateState((prev) => {
      const proposals = prev.proposals.map((item) => {
        if (item.id !== proposal.id || item.status !== 'open') return item
        return {
          ...item,
          votesFor: item.votesFor + (direction === 'for' ? 1 : 0),
          votesAgainst: item.votesAgainst + (direction === 'against' ? 1 : 0),
        }
      })
      return addAudit(
        { ...prev, proposals },
        'Lender',
        'Governance vote',
        `Vote ${direction} on ${proposal.id}.`,
      )
    })
  }

  const handleReset = () => {
    clearState()
    setState(defaultState)
  }

  const renderOverview = () => (
    <section className="section">
      <div className="hero">
        <div>
          <p className="eyebrow">No-Money MVP • Conceptual Prototype</p>
          <h1>Lend-a-Dollar MVP Console</h1>
          <p className="lead">
            A working, no-money simulation of the borrower, lender, admin, and
            governance flows. This demo uses mock data and synthetic decisions to
            pressure-test dignity-first lending mechanics.
          </p>
          <div className="pill-row">
            <span className="pill">No real funds</span>
            <span className="pill">Mock underwriting</span>
            <span className="pill">Human override</span>
            <span className="pill">Transparency-first</span>
          </div>
          <a className="infographic-link" href="/lad-poster-portrait.png" target="_blank" rel="noreferrer">
            View How It Works Infographic →
          </a>
        </div>
      </div>

      <div className="grid two">
        <div className="hero-card">
          <h3>Live Snapshot</h3>
          <div className="metric-grid">
            <div>
              <p className="metric-label">Total contributions</p>
              <p className="metric-value">
                {formatCurrency(stats.totalContributions)}
              </p>
            </div>
            <div>
              <p className="metric-label">Available to borrow (70%)</p>
              <p className="metric-value">
                {formatCurrency(stats.availableToBorrow)}
              </p>
            </div>
            <div>
              <p className="metric-label">Yield sleeve (30%)</p>
              <p className="metric-value">{formatCurrency(stats.yieldSleeve)}</p>
            </div>
            <div>
              <p className="metric-label">Current outstanding</p>
              <p className="metric-value">{formatCurrency(stats.totalBalance)}</p>
            </div>
            <div>
              <p className="metric-label">Total issued (to date)</p>
              <p className="metric-value">{formatCurrency(stats.totalPrincipal)}</p>
            </div>
            <div>
              <p className="metric-label">Write-off rate</p>
              <p className="metric-value">{formatPercent(stats.defaultRate)}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <h3>Scenario Inputs</h3>
          <label>
            Total contributions (X)
            <input
              type="number"
              min={0}
              value={scenario.totalContributions}
              onChange={(event) =>
                setScenario((current) => ({
                  ...current,
                  totalContributions: Number(event.target.value),
                }))
              }
            />
          </label>
          <label>
            Total issued (% of available)
            <input
              type="number"
              min={0}
              max={100}
              value={scenario.borrowedRate}
              onChange={(event) =>
                setScenario((current) => ({
                  ...current,
                  borrowedRate: Number(event.target.value),
                }))
              }
            />
          </label>
          <p className="muted small">
            Portfolio ratios (outstanding balance and write-offs) are scaled from
            the current loan data.
          </p>
        </div>
        <div className="card">
          <h3>Borrower Dignity Requirements</h3>
          <ul>
            <li>No coercive collections or shame-based UX.</li>
            <li>Clear, plain-language loan terms.</li>
            <li>Appeals and human review available.</li>
            <li>Write-offs are acceptable outcomes.</li>
          </ul>
        </div>
        <div className="card">
          <h3>MVP Guardrails</h3>
          <ul>
            <li>No live KYC/AML or payment rails.</li>
            <li>No stablecoins or yield strategies.</li>
            <li>All data is synthetic and local.</li>
            <li>Purpose: validate flows, not revenue.</li>
          </ul>
        </div>
      </div>
    </section>
  )

  const renderBorrower = () => (
    <section className="section">
      <div className="section-header">
        <div>
          <h2>Borrower Experience</h2>
          <p className="muted">
            Apply for a micro-loan with mock documentation and simulated AI review.
          </p>
        </div>
        {state.platformPaused && <span className="status danger">Paused</span>}
      </div>

      <div className="grid two">
        <div className="card">
          <h3>New Application</h3>
          <div className="form-grid">
            <label>
              Full name
              <input
                value={borrowerForm.name}
                onChange={(event) =>
                  setBorrowerForm({ ...borrowerForm, name: event.target.value })
                }
                placeholder="Borrower name"
              />
            </label>
            <label>
              State
              <select
                value={borrowerForm.state}
                onChange={(event) =>
                  setBorrowerForm({ ...borrowerForm, state: event.target.value })
                }
              >
                {US_STATES.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Requested amount
              <input
                type="number"
                min={100}
                max={10000}
                value={borrowerForm.amount}
                onChange={(event) =>
                  setBorrowerForm({
                    ...borrowerForm,
                    amount: Number(event.target.value),
                  })
                }
              />
            </label>
            <label>
              Monthly income
              <input
                type="number"
                min={0}
                value={borrowerForm.monthlyIncome}
                onChange={(event) =>
                  setBorrowerForm({
                    ...borrowerForm,
                    monthlyIncome: Number(event.target.value),
                  })
                }
              />
            </label>
            <label className="wide">
              Purpose
              <select
                value={borrowerForm.purpose}
                onChange={(event) =>
                  setBorrowerForm({ ...borrowerForm, purpose: event.target.value })
                }
              >
                {PURPOSE_OPTIONS.map((purpose) => (
                  <option key={purpose} value={purpose}>
                    {purpose}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="doc-list">
            <p className="muted">Mock documentation</p>
            {DOC_OPTIONS.map((doc) => (
              <label key={doc} className="checkbox">
                <input
                  type="checkbox"
                  checked={borrowerForm.docs.includes(doc)}
                  onChange={(event) =>
                    setBorrowerForm((current) => ({
                      ...current,
                      docs: event.target.checked
                        ? [...current.docs, doc]
                        : current.docs.filter((item) => item !== doc),
                    }))
                  }
                />
                {doc}
              </label>
            ))}
          </div>

          <button
            className="primary"
            disabled={state.platformPaused}
            onClick={handleBorrowerSubmit}
          >
            Submit application
          </button>
          {state.platformPaused && (
            <p className="muted">
              Submissions are paused while the platform is in review mode.
            </p>
          )}
        </div>

        <div className="card">
          <h3>Your Applications</h3>
          <div className="stack">
            {state.applications.length === 0 && (
              <p className="muted">No applications yet.</p>
            )}
            {state.applications.map((app) => (
              <div key={app.id} className="item">
                <div>
                  <strong>{app.name}</strong>
                  <p className="muted">
                    {formatCurrency(app.amount)} • {app.purpose}
                  </p>
                  <p className="muted small">
                    AI score {app.aiScore} ({app.aiDecision})
                  </p>
                </div>
                <span className={`status ${app.status}`}>
                  {app.status.replace('-', ' ')}
                </span>
                {app.status === 'denied' && (
                  <div className="appeal">
                    <textarea
                      placeholder="Appeal note (optional)"
                      value={appealNotes[app.id] ?? ''}
                      onChange={(event) =>
                        setAppealNotes((prev) => ({
                          ...prev,
                          [app.id]: event.target.value,
                        }))
                      }
                    />
                    <button
                      onClick={() => handleAppeal(app.id, appealNotes[app.id] || '')}
                    >
                      Submit appeal
                    </button>
                  </div>
                )}
                {app.status === 'appealed' && (
                  <p className="muted small">Appeal submitted. Human review pending.</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )

  const renderLender = () => (
    <section className="section">
      <div className="section-header">
        <div>
          <h2>Lender Experience</h2>
          <p className="muted">
            Contribute small monthly amounts and see capped exposure in action.
          </p>
        </div>
        <span className="status info">Simulated</span>
      </div>

      <div className="grid two">
        <div className="card">
          <h3>Lender Profile</h3>
          <label>
            Lender name
            <input
              value={state.lender.name}
              onChange={(event) => handleLenderUpdate({ name: event.target.value })}
            />
          </label>
          <label>
            Monthly contribution
            <input
              type="number"
              min={1}
              max={10}
              value={state.lender.monthlyContribution}
              onChange={(event) =>
                handleLenderUpdate({
                  monthlyContribution: Number(event.target.value),
                })
              }
            />
          </label>
          <label>
            Lending allocation (%)
            <input
              type="number"
              min={70}
              max={90}
              value={LENDING_ALLOCATION}
              disabled
            />
          </label>
          <label>
            Yield allocation (%)
            <input
              type="number"
              min={10}
              max={30}
              value={YIELD_ALLOCATION}
              disabled
            />
          </label>
          <label>
            Max exposure
            <input
              type="number"
              min={50}
              max={150}
              value={state.lender.maxExposure}
              onChange={(event) =>
                handleLenderUpdate({ maxExposure: Number(event.target.value) })
              }
            />
          </label>
          <button className="primary" onClick={() => handleDeposit(25)}>
            Simulate $25 deposit
          </button>
        </div>

        <div className="card">
          <h3>Lender Snapshot</h3>
          <div className="metric-grid">
            <div>
              <p className="metric-label">Lender since</p>
              <p className="metric-value">
                {new Date(state.lender.since).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="metric-label">Total lending to date</p>
              <p className="metric-value">
                {formatCurrency(stats.lenderTotalLending)}
              </p>
            </div>
            <div>
              <p className="metric-label">Current lending balance</p>
              <p className="metric-value">
                {formatCurrency(stats.lenderCurrentBalance)}
              </p>
            </div>
          </div>
          <div className="card note">
            <p className="metric-label">Lender share breakdown</p>
            <div className="metric-grid">
              <div>
                <p className="metric-label">Write-offs</p>
                <p className="metric-value">
                  {formatCurrency(stats.lenderWriteoffShare)}
                </p>
              </div>
              <div>
                <p className="metric-label">Repayments returned</p>
                <p className="metric-value">
                  {formatCurrency(stats.lenderRepayments)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )

  const renderAdmin = () => (
    <section className="section">
      <div className="section-header">
        <div>
          <h2>Admin Console</h2>
          <p className="muted">
            Manual overrides, appeals review, and write-off simulations.
          </p>
        </div>
        <button
          className={state.platformPaused ? 'danger' : 'primary'}
          onClick={() =>
            updateState((prev) =>
              addAudit(
                { ...prev, platformPaused: !prev.platformPaused },
                'Admin',
                prev.platformPaused ? 'Platform resumed' : 'Platform paused',
                'Platform pause toggle changed.',
              ),
            )
          }
        >
          {state.platformPaused ? 'Resume platform' : 'Pause platform'}
        </button>
      </div>

      <div className="grid two">
        <div className="card">
          <h3>Applications</h3>
          <div className="stack">
            {state.applications.map((app) => (
              <div key={app.id} className="item">
                <div>
                  <strong>{app.name}</strong>
                  <p className="muted">
                    {formatCurrency(app.amount)} • {app.purpose}
                  </p>
                  <p className="muted small">
                    AI score {app.aiScore} ({app.aiDecision})
                  </p>
                  {app.appealNote && (
                    <p className="appeal-note">Appeal: {app.appealNote}</p>
                  )}
                </div>
                <span className={`status ${app.status}`}>
                  {app.status.replace('-', ' ')}
                </span>
                <div className="actions">
                  <button onClick={() => handleAdminDecision(app.id, 'approved')}>
                    Approve
                  </button>
                  <button onClick={() => handleAdminDecision(app.id, 'denied')}>
                    Deny
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3>Active Loans</h3>
          <div className="stack">
            {state.loans.map((loan) => (
              <div key={loan.id} className="item">
                <div>
                  <strong>{loan.borrowerName}</strong>
                  <p className="muted">
                    {formatCurrency(loan.balance)} balance •{' '}
                    {formatCurrency(loan.monthlyPayment)} / month
                  </p>
                  <p className="muted small">Status: {loan.status}</p>
                </div>
                <div className="actions">
                  <button
                    disabled={loan.status !== 'active'}
                    onClick={() => handlePayment(loan.id)}
                  >
                    Simulate payment
                  </button>
                  <button
                    disabled={loan.status !== 'active'}
                    onClick={() => handleWriteOff(loan.id)}
                  >
                    Write off
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )

  const renderGovernance = () => (
    <section className="section">
      <div className="section-header">
        <div>
          <h2>Governance</h2>
          <p className="muted">Community proposals with one-dollar-one-vote rules.</p>
        </div>
        <span className="status info">Mock voting</span>
      </div>

      <div className="grid two">
        {state.proposals.map((proposal) => (
          <div key={proposal.id} className="card">
            <h3>{proposal.title}</h3>
            <p className="muted">{proposal.description}</p>
            <div className="metric-grid">
              <div>
                <p className="metric-label">For</p>
                <p className="metric-value">{proposal.votesFor}</p>
              </div>
              <div>
                <p className="metric-label">Against</p>
                <p className="metric-value">{proposal.votesAgainst}</p>
              </div>
            </div>
            <div className="actions">
              <button onClick={() => handleVote(proposal, 'for')}>Vote for</button>
              <button onClick={() => handleVote(proposal, 'against')}>
                Vote against
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )

  const renderTransparency = () => (
    <section className="section">
      <div className="section-header">
        <div>
          <h2>Transparency Dashboard</h2>
          <p className="muted">
            Public reporting on pool health, write-offs, and borrower outcomes.
          </p>
        </div>
        <span className="status info">Simulated data</span>
      </div>

      <div className="grid three">
        <div className="card">
          <h3>Contributions</h3>
          <p className="metric-label">Total contributions</p>
          <p className="metric-value">
            {formatCurrency(stats.totalContributions)}
          </p>
          <p className="metric-label">Available to borrow (70%)</p>
          <p className="metric-value">
            {formatCurrency(stats.availableToBorrow)}
          </p>
          <p className="metric-label">Yield sleeve (30%)</p>
          <p className="metric-value">{formatCurrency(stats.yieldSleeve)}</p>
          <p className="metric-label">Target yield rate</p>
          <p className="metric-value">{formatPercent(YIELD_RATE * 100)}</p>
        </div>
        <div className="card">
          <h3>Borrowing</h3>
          <p className="metric-label">Total issued (to date)</p>
          <p className="metric-value">{formatCurrency(stats.totalPrincipal)}</p>
          <p className="metric-label">Current outstanding</p>
          <p className="metric-value">{formatCurrency(stats.totalBalance)}</p>
        </div>
        <div className="card">
          <h3>Write-offs</h3>
          <p className="metric-label">Total write-offs</p>
          <p className="metric-value">{formatCurrency(stats.totalWriteoffs)}</p>
          <p className="metric-label">Write-off rate</p>
          <p className="metric-value">{formatPercent(stats.defaultRate)}</p>
        </div>
      </div>

      <div className="grid two">
        <div className="card">
          <h3>Yield Income Allocation</h3>
          <p className="metric-label">Estimated annual yield income</p>
          <p className="metric-value">{formatCurrency(stats.yieldIncome)}</p>
          <p className="metric-label">Platform ops (50%)</p>
          <p className="metric-value">{formatCurrency(stats.platformOps)}</p>
          <p className="metric-label">Lender incentives (30%)</p>
          <p className="metric-value">{formatCurrency(stats.lenderIncentives)}</p>
          <p className="metric-label">Resilience reserve (20%)</p>
          <p className="metric-value">{formatCurrency(stats.resilienceReserve)}</p>
        </div>
        <div className="card">
          <h3>Scenario Inputs</h3>
          <label>
            Total contributions (X)
            <input
              type="number"
              min={0}
              value={scenario.totalContributions}
              onChange={(event) =>
                setScenario((current) => ({
                  ...current,
                  totalContributions: Number(event.target.value),
                }))
              }
            />
          </label>
          <label>
            Total issued (% of available)
            <input
              type="number"
              min={0}
              max={100}
              value={scenario.borrowedRate}
              onChange={(event) =>
                setScenario((current) => ({
                  ...current,
                  borrowedRate: Number(event.target.value),
                }))
              }
            />
          </label>
          <p className="muted small">
            Portfolio ratios (outstanding balance and write-offs) are scaled from
            the current loan data.
          </p>
        </div>
      </div>

      <div className="grid two">
        <div className="card">
          <h3>Borrower Outcomes</h3>
          <p className="metric-label">Applications</p>
          <p className="metric-value">{state.applications.length}</p>
          <p className="metric-label">Appeals</p>
          <p className="metric-value">
            {state.applications.filter((app) => app.status === 'appealed').length}
          </p>
        </div>
        <div className="card">
          <h3>Audit Log</h3>
          <div className="stack">
            {state.audit.map((event) => (
              <div key={event.id} className="item">
                <div>
                  <strong>{event.action}</strong>
                  <p className="muted small">{event.detail}</p>
                </div>
                <span className="muted small">{event.actor}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <h3>Reset Demo</h3>
          <p className="muted">
            Clears local storage and restores the default demo dataset.
          </p>
          <button className="danger" onClick={handleReset}>
            Reset local demo data
          </button>
        </div>
      </div>
    </section>
  )

  return (
    <div className="app">
      <header className="header">
        <div>
          <p className="eyebrow">Lend-a-Dollar</p>
          <p className="title">MVP Simulation Console</p>
        </div>
        <div className="badge-row">
          <span className="badge">No real money</span>
          <span className="badge">Synthetic data</span>
        </div>
      </header>

      <nav className="nav">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            className={view === item.id ? 'active' : ''}
            onClick={() => setView(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {view === 'home' && renderOverview()}
      {view === 'borrower' && renderBorrower()}
      {view === 'lender' && renderLender()}
      {view === 'admin' && renderAdmin()}
      {view === 'governance' && renderGovernance()}
      {view === 'transparency' && renderTransparency()}
    </div>
  )
}

export default App
