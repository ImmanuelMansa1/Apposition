import { useEffect, useMemo, useState } from 'react'
import type { SubmitEvent, KeyboardEvent } from 'react'
import { analyzeIdea } from './api'
import Swirl from './Swirl'
import type { Analysis, Brief, Competitor, Differentiator, Severity, Weakness } from './types'
import './App.css'

type View = 'input' | 'loading' | 'results'
type SortKey = 'similarity' | 'rating' | 'price'

const EMPTY: Brief = { idea: '', features: [], audience: '' }

const STEPS = ['App idea', 'Features', 'Audience']

const STAGES = [
  'Reading your idea',
  'Searching the App Store',
  'Scoring similarity',
  'Reading competitor reviews',
  'Building your strategy',
]
const STAGE_MS = 800

const EXAMPLES: Brief[] = [
  {
    idea: 'lets neighbours swap houseplants and cuttings',
    features: ['Plant listings', 'In-app chat', 'Map of nearby swaps'],
    audience: 'urban gardeners aged 25-45',
  },
  {
    idea: 'splits grocery bills between roommates automatically',
    features: ['Receipt scanning', 'Shared lists', 'Payment reminders'],
    audience: 'college students in shared housing',
  },
  {
    idea: 'matches beginner runners with buddies at the same pace',
    features: ['Pace matching', 'Route sharing', 'Group runs'],
    audience: 'new runners aged 20-35',
  },
]

const SEVERITY_WEIGHT: Record<Severity, number> = { high: 3, medium: 2, low: 1 }

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

function App() {
  const [view, setView] = useState<View>('input')
  const [brief, setBrief] = useState<Brief>(EMPTY)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState(0)

  const landing = view === 'input' && step === 0

  const run = async () => {
    setView('loading')
    setError(null)
    try {
      const [result] = await Promise.all([analyzeIdea(brief), wait(STAGES.length * STAGE_MS)])
      setAnalysis(result)
      setView('results')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setView('input')
    }
  }

  const restart = () => {
    setBrief(EMPTY)
    setAnalysis(null)
    setStep(0)
    setView('input')
  }

  return (
    <div className={`app${landing ? ' landing' : ''}`}>
      <Swirl active={landing} />
      <header className="hero">
        <Tiles />
        <Logo />
        <p className="tagline">Know your competition before you build.</p>
        <div className="hero-bar" aria-hidden />
      </header>

      <main className={view === 'results' ? 'wide' : undefined}>
        {view === 'input' && (
          <BriefForm
            brief={brief}
            setBrief={setBrief}
            step={step}
            setStep={setStep}
            onSubmit={run}
            error={error}
          />
        )}
        {view === 'loading' && <Loading />}
        {view === 'results' && analysis && (
          <Results brief={brief} analysis={analysis} onRestart={restart} />
        )}
      </main>

      <footer>
        <p>Built with Apposition</p>
      </footer>
    </div>
  )
}

/* ---------------- Step 1–3 form ---------------- */

interface BriefFormProps {
  brief: Brief
  setBrief: (b: Brief) => void
  step: number
  setStep: (step: number) => void
  onSubmit: () => void
  error: string | null
}

function BriefForm({ brief, setBrief, step, setStep, onSubmit, error }: BriefFormProps) {
  const [back, setBack] = useState(false)
  const [draft, setDraft] = useState('')

  const canNext = [brief.idea.trim(), true, brief.audience.trim()][step]
  const last = step === STEPS.length - 1

  const go = (to: number) => {
    setBack(to < step)
    setStep(to)
  }

  const handleSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!canNext) return
    if (last) onSubmit()
    else go(step + 1)
  }

  const addFeature = () => {
    const f = draft.trim().replace(/,$/, '')
    if (f && !brief.features.includes(f)) setBrief({ ...brief, features: [...brief.features, f] })
    setDraft('')
  }

  const removeFeature = (f: string) =>
    setBrief({ ...brief, features: brief.features.filter((x) => x !== f) })

  const onChipKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      if (!draft.trim()) return
      e.preventDefault()
      addFeature()
    } else if (e.key === 'Backspace' && !draft && brief.features.length) {
      removeFeature(brief.features[brief.features.length - 1])
    }
  }

  return (
    <form className="brief" onSubmit={handleSubmit}>
      <ol className="stepper">
        {STEPS.map((label, i) => (
          <li key={label} className={i === step ? 'current' : i < step ? 'done' : undefined}>
            <button type="button" onClick={() => i < step && go(i)} disabled={i > step}>
              <span className="step-num">{i < step ? '✓' : i + 1}</span>
              <span className="step-label">{label}</span>
            </button>
          </li>
        ))}
      </ol>
      <div className="progress" aria-hidden>
        <div style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
      </div>

      <div key={step} className={`panel${back ? ' back' : ''}`}>
        {step === 0 && (
          <>
            <h2 className="landing-title">Know your competition before you build.</h2>
            <label className="field">
              <span className="field-label">I have an idea for an app that&hellip;</span>
              <textarea
                autoFocus
                value={brief.idea}
                onChange={(e) => setBrief({ ...brief, idea: e.target.value })}
                placeholder="lets neighbours swap houseplants and cuttings"
                rows={3}
              />
            </label>
            <div className="examples">
              <span>Try an example:</span>
              {EXAMPLES.map((ex) => (
                <button type="button" key={ex.idea} className="chip ghost" onClick={() => setBrief(ex)}>
                  {ex.idea.split(' ').slice(0, 4).join(' ')}&hellip;
                </button>
              ))}
            </div>
          </>
        )}

        {step === 1 && (
          <label className="field">
            <span className="field-label">What are its key features?</span>
            <span className="hint">Press Enter after each one. Optional, but sharper results.</span>
            <div className="chip-input">
              {brief.features.map((f) => (
                <span key={f} className="chip">
                  {f}
                  <button type="button" aria-label={`Remove ${f}`} onClick={() => removeFeature(f)}>
                    ×
                  </button>
                </span>
              ))}
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={onChipKey}
                onBlur={addFeature}
                placeholder={brief.features.length ? 'Add another…' : 'e.g. in-app chat'}
              />
            </div>
          </label>
        )}

        {step === 2 && (
          <label className="field">
            <span className="field-label">Who is it for?</span>
            <textarea
              autoFocus
              value={brief.audience}
              onChange={(e) => setBrief({ ...brief, audience: e.target.value })}
              placeholder="urban gardeners aged 25-45"
              rows={2}
            />
          </label>
        )}
      </div>

      {error && <p className="error">{error}</p>}

      <div className="actions">
        {step > 0 && (
          <button type="button" className="secondary" onClick={() => go(step - 1)}>
            Back
          </button>
        )}
        <button type="submit" className="primary" disabled={!canNext}>
          {last ? 'Find my competitors' : 'Next'}
        </button>
      </div>
    </form>
  )
}

/* ---------------- Loading ---------------- */

function Loading() {
  const [stage, setStage] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), STAGE_MS)
    return () => clearInterval(id)
  }, [])

  return (
    <section className="loading" aria-live="polite">
      <Orbit />
      <p className="fetch-caption">Scanning the App Store for your competitors&hellip;</p>
      <ul>
        {STAGES.map((label, i) => (
          <li key={label} className={i < stage ? 'done' : i === stage ? 'active' : undefined}>
            <span className="dot">{i < stage ? '✓' : ''}</span>
            {label}
            {i === stage && '…'}
          </li>
        ))}
      </ul>
    </section>
  )
}

/* ---------------- Results ---------------- */

interface ResultsProps {
  brief: Brief
  analysis: Analysis
  onRestart: () => void
}

type RankedWeakness = Weakness & { app: string }

function Results({ brief, analysis, onRestart }: ResultsProps) {
  const [sort, setSort] = useState<SortKey>('similarity')
  const [open, setOpen] = useState<string | null>(analysis.competitors[0]?.id ?? null)
  const [planned, setPlanned] = useState<Set<number>>(new Set())

  const competitors = useMemo(() => {
    const list = [...analysis.competitors]
    if (sort === 'similarity') list.sort((a, b) => b.similarity - a.similarity)
    if (sort === 'rating') list.sort((a, b) => b.rating - a.rating)
    if (sort === 'price') list.sort((a, b) => a.price - b.price)
    return list
  }, [analysis, sort])

  const weaknesses = useMemo<RankedWeakness[]>(
    () =>
      analysis.competitors
        .flatMap((c) => c.weaknesses.map((w) => ({ ...w, app: c.name })))
        .sort((a, b) => SEVERITY_WEIGHT[b.severity] * b.mentions - SEVERITY_WEIGHT[a.severity] * a.mentions),
    [analysis],
  )

  const togglePlanned = (i: number) =>
    setPlanned((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })

  return (
    <div className="results">
      <p className="demo-note">Demo data. Live App Store results arrive once the backend is connected.</p>

      <section className="overview">
        <div className="card idea-card">
          <h2>Your idea</h2>
          <p className="summary">{analysis.summary}</p>
          {brief.features.length > 0 && (
            <div className="chips">
              {brief.features.map((f) => (
                <span key={f} className="chip">{f}</span>
              ))}
            </div>
          )}
        </div>
        <div className="card gauge-card">
          <Gauge value={analysis.saturation} />
          <p className="gauge-caption">
            {analysis.competitors.length} similar apps found. {saturationText(analysis.saturation)}
          </p>
        </div>
      </section>

      <section>
        <div className="section-head">
          <h2>Top competitors</h2>
          <div className="segmented" role="group" aria-label="Sort competitors">
            {(['similarity', 'rating', 'price'] as SortKey[]).map((k) => (
              <button key={k} type="button" className={sort === k ? 'on' : undefined} onClick={() => setSort(k)}>
                {k[0].toUpperCase() + k.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <ul className="competitors">
          {competitors.map((c) => (
            <CompetitorCard
              key={c.id}
              competitor={c}
              open={open === c.id}
              onToggle={() => setOpen(open === c.id ? null : c.id)}
            />
          ))}
        </ul>
      </section>

      <section>
        <div className="section-head">
          <h2>How to beat them</h2>
          <span className="muted">Ranked by severity × how often users complain</span>
        </div>
        <ol className="beat-list">
          {weaknesses.map((w, i) => (
            <li key={`${w.app}-${w.issue}`} className="card">
              <span className="rank">{i + 1}</span>
              <div>
                <p className="issue">
                  {w.issue} <span className={`sev ${w.severity}`}>{w.severity}</span>
                </p>
                <p className="muted small">
                  {w.app} · {w.mentions.toLocaleString()} review mentions
                </p>
                <p className="fix">→ {w.howToBeat}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <div className="section-head">
          <h2>Your differentiation plan</h2>
          <span className="muted">
            {planned.size}/{analysis.differentiators.length} planned
          </span>
        </div>
        <ul className="plan">
          {analysis.differentiators.map((d, i) => (
            <li key={d.title}>
              <label className={`card plan-item${planned.has(i) ? ' checked' : ''}`}>
                <input type="checkbox" checked={planned.has(i)} onChange={() => togglePlanned(i)} />
                <div>
                  <p>
                    <span className={`tag ${d.type}`}>{d.type}</span> <strong>{d.title}</strong>
                  </p>
                  <p className="muted small">{d.detail}</p>
                </div>
              </label>
            </li>
          ))}
        </ul>
      </section>

      <div className="actions sticky">
        <button type="button" className="secondary" onClick={onRestart}>
          New idea
        </button>
        <button
          type="button"
          className="primary"
          onClick={() => exportDoc(analysis, weaknesses, analysis.differentiators.filter((_, i) => planned.has(i)))}
        >
          Download report
        </button>
      </div>
    </div>
  )
}

function CompetitorCard({ competitor: c, open, onToggle }: { competitor: Competitor; open: boolean; onToggle: () => void }) {
  return (
    <li className={`card competitor${open ? ' open' : ''}`}>
      <button type="button" className="competitor-head" onClick={onToggle} aria-expanded={open}>
        <AppIcon name={c.name} url={c.iconUrl} />
        <div className="competitor-meta">
          <strong>{c.name}</strong>
          <span className="muted small">
            {c.developer} · {c.genre}
          </span>
          <span className="small">
            {c.price === 0 ? 'Free' : `$${c.price.toFixed(2)}`} · ★ {c.rating.toFixed(1)}{' '}
            <span className="muted">({compact(c.ratingCount)})</span>
          </span>
        </div>
        <Ring value={c.similarity} />
        <span className="chevron" aria-hidden>
          ›
        </span>
      </button>
      {open && (
        <div className="competitor-body">
          <div>
            <h3>Overlaps with you</h3>
            <div className="chips">
              {c.overlap.map((o) => (
                <span key={o} className="chip">{o}</span>
              ))}
            </div>
          </div>
          <div className="pros-cons">
            <div>
              <h3>Users love</h3>
              <ul>
                {c.praises.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3>Users complain</h3>
              <ul>
                {c.weaknesses.map((w) => (
                  <li key={w.issue}>
                    {w.issue} <span className={`sev ${w.severity}`}>{w.severity}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </li>
  )
}

/* ---------------- Small visuals ---------------- */

function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <circle cx="50" cy="50" r="50" className="mark-disc" />
      <g className="mark-a">
        <circle cx="48" cy="50.8" r="30.5" fill="#fff" />
        <rect x="64.8" y="50.8" width="13.7" height="30.5" fill="#fff" />
        <circle cx="49.5" cy="47.3" r="15.3" className="mark-hole" />
        <rect x="61.6" y="58" width="3.2" height="12" className="mark-hole" />
      </g>
    </svg>
  )
}

const WORDMARK = [...'Apposition']

function Logo() {
  return (
    <h1 className="logo" aria-label="Apposition">
      <LogoMark className="logo-mark" />
      <span className="wordmark" aria-hidden>
        {WORDMARK.map((ch, i) => (
          <span key={i} style={{ animationDelay: `${0.35 + i * 0.05}s` }}>
            {ch}
          </span>
        ))}
      </span>
    </h1>
  )
}

const TILES = [8, 19, 31, 44, 58, 69, 81, 92]

function Tiles() {
  return (
    <div className="tiles" aria-hidden>
      {TILES.map((left, i) => (
        <span key={left} style={{ left: `${left}%`, animationDelay: `${(i * 1.13) % 9}s` }} />
      ))}
    </div>
  )
}

function Orbit() {
  return (
    <div className="orbit" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div key={i} className={`orbit-ring r${i}`}>
          <span />
          <span />
        </div>
      ))}
      <LogoMark className="orbit-mark" />
    </div>
  )
}

function AppIcon({ name, url }: { name: string; url?: string }) {
  if (url) return <img className="app-icon" src={url} alt="" />
  const hue = [...name].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 360, 7)
  return (
    <span className="app-icon" style={{ background: `hsl(${hue} 60% 55%)` }} aria-hidden>
      {name[0]}
    </span>
  )
}

function Ring({ value }: { value: number }) {
  const r = 22
  const c = 2 * Math.PI * r
  const pct = Math.round(value * 100)
  return (
    <div className="ring" title={`${pct}% similar`}>
      <svg viewBox="0 0 52 52" aria-hidden>
        <circle cx="26" cy="26" r={r} className="ring-track" />
        <circle
          cx="26"
          cy="26"
          r={r}
          className={`ring-fill ${pct >= 75 ? 'high' : pct >= 55 ? 'medium' : 'low'}`}
          strokeDasharray={c}
          style={{ strokeDashoffset: c * (1 - value), ['--c' as string]: c }}
        />
      </svg>
      <span>{pct}%</span>
    </div>
  )
}

function Gauge({ value }: { value: number }) {
  return (
    <div className="gauge">
      <svg viewBox="0 0 120 68" aria-hidden>
        <path d="M10 60 A50 50 0 0 1 110 60" pathLength={100} className="gauge-track" />
        <path
          d="M10 60 A50 50 0 0 1 110 60"
          pathLength={100}
          className="gauge-fill"
          style={{ strokeDasharray: `${value} 100` }}
        />
      </svg>
      <div className="gauge-value">
        <strong>{value}</strong>
        <span>{saturationLabel(value)}</span>
      </div>
    </div>
  )
}

/* ---------------- Helpers ---------------- */

function saturationLabel(v: number) {
  return v < 35 ? 'Open field' : v < 65 ? 'Competitive' : 'Crowded'
}

function saturationText(v: number) {
  if (v < 35) return 'Few direct rivals — room to pioneer.'
  if (v < 65) return 'Real competition, but clear gaps to exploit.'
  return 'Crowded market — differentiation is essential.'
}

function compact(n: number) {
  return Intl.NumberFormat('en', { notation: 'compact' }).format(n)
}

function escape(s: string) {
  return s.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]!)
}

// Word opens HTML saved with a .doc extension, so no extra library is needed.
function exportDoc(a: Analysis, weaknesses: RankedWeakness[], planned: Differentiator[]) {
  const plan = planned.length ? planned : a.differentiators
  const html = `<html><head><meta charset="utf-8"><title>Market analysis</title></head><body>
<h1>Market analysis</h1>
<p>${escape(a.summary)}</p>
<p><b>Market saturation:</b> ${a.saturation}/100 (${saturationLabel(a.saturation)})</p>
<h2>Top competitors</h2>
<table border="1" cellpadding="6" cellspacing="0">
<tr><th>App</th><th>Developer</th><th>Price</th><th>Rating</th><th>Similarity</th><th>Overlap</th></tr>
${a.competitors
  .map(
    (c) =>
      `<tr><td>${escape(c.name)}</td><td>${escape(c.developer)}</td><td>${c.price === 0 ? 'Free' : '$' + c.price.toFixed(2)}</td><td>${c.rating.toFixed(1)}</td><td>${Math.round(c.similarity * 100)}%</td><td>${escape(c.overlap.join(', '))}</td></tr>`,
  )
  .join('')}
</table>
<h2>How to beat them</h2>
<ol>${weaknesses.map((w) => `<li><b>${escape(w.issue)}</b> (${escape(w.app)}, ${w.severity}): ${escape(w.howToBeat)}</li>`).join('')}</ol>
<h2>Differentiation plan</h2>
<ul>${plan.map((d) => `<li><b>${d.type.toUpperCase()}: ${escape(d.title)}</b> — ${escape(d.detail)}</li>`).join('')}</ul>
</body></html>`
  const url = URL.createObjectURL(new Blob([html], { type: 'application/msword' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'market_analysis_document.doc'
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default App
