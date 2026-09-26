import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { SubmitEvent, KeyboardEvent } from 'react'
import { analyzeIdea } from './api'
import LiquidGlassButton from './LiquidGlassButton'
import type { LiquidGlassButtonProps } from './LiquidGlassButton'
import Preloader from './Preloader'
import Typewriter from './Typewriter'
import Showcase from './Showcase'
import Starfield from './Starfield'
import { scrollToTop, startSmoothScroll } from './SmoothScroll'
import TopApps from './TopApps'
import type { Analysis, Brief, Competitor, Differentiator, Severity, Weakness } from './types'
import './App.css'

type View = 'input' | 'loading' | 'results'
type SortKey = 'similarity' | 'rating' | 'price'

const EMPTY: Brief = { idea: '', features: [], audience: '' }

const HEADLINES = [
  'Test and build faster with Apposition.',
  'Know your competition before you build.',
  'Find the gap your rivals missed.',
]

const STAGES = [
  'Reading your idea',
  'Searching the App Store',
  'Scoring similarity',
  'Reading competitor reviews',
  'Building your strategy',
]
const STAGE_MS = 800

// One-line prompts; each names the idea, a few features and who it's for.
const EXAMPLES = [
  'lets neighbours swap houseplants and cuttings, with plant listings, in-app chat and a map of nearby swaps, for urban gardeners',
  'splits grocery bills between roommates automatically, with receipt scanning and payment reminders, for college students',
  'matches beginner runners with buddies at the same pace, with route sharing and group runs',
]

const SEVERITY_WEIGHT: Record<Severity, number> = { high: 3, medium: 2, low: 1 }

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

type Theme = 'light' | 'dark'

// index.html sets data-theme before first paint (saved choice, else the system setting).
const initialTheme = (): Theme => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light')

const ThemeContext = createContext<Theme>('light')

function App() {
  const [view, setView] = useState<View>('input')
  const [brief, setBrief] = useState<Brief>(EMPTY)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [preloading, setPreloading] = useState(true)
  const [theme, setTheme] = useState<Theme>(initialTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(startSmoothScroll, [])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    try {
      localStorage.setItem('theme', next)
    } catch {
      // storage blocked: the toggle still works for this visit
    }
  }

  const landing = view === 'input'

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

  const tryIt = () => {
    scrollToTop()
    document.querySelector<HTMLTextAreaElement>('.brief textarea')?.focus({ preventScroll: true })
  }

  const restart = () => {
    setBrief(EMPTY)
    setAnalysis(null)
    setView('input')
  }

  return (
    <ThemeContext.Provider value={theme}>
      <div className={`app${landing ? ' landing' : ''}${preloading ? ' preloading' : ''}`}>
        <Starfield
          background={theme === 'dark' ? '#000000' : '#ffffff'}
          starColor={theme === 'dark' ? '#ffffff' : '#1d3374'}
        />
        <button
          type="button"
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        >
          {theme === 'dark' ? (
            <svg viewBox="0 0 24 24" aria-hidden>
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
            </svg>
          )}
        </button>
        {preloading && (
          <Preloader onDone={() => setPreloading(false)}>
            <LogoMark className="preloader-mark" />
          </Preloader>
        )}
        <header className="hero">
          <Tiles />
          <Logo />
          <p className="tagline">Know your competition before you build.</p>
          <div className="hero-bar" aria-hidden />
        </header>

        <main className={view === 'results' ? 'wide' : undefined}>
          {view === 'input' && (
            <BriefForm brief={brief} setBrief={setBrief} onSubmit={run} error={error} introDone={!preloading} />
          )}
          {view === 'input' && <TopApps />}
          {landing && (
            <a className="scroll-hint" href="#how">
              How it works <span aria-hidden>↓</span>
            </a>
          )}
          {view === 'loading' && <Loading />}
          {view === 'results' && analysis && <Results brief={brief} analysis={analysis} onRestart={restart} />}
        </main>

        {landing && <Showcase onTry={tryIt} />}

        <GlassFooter showHow={landing} />
      </div>
    </ThemeContext.Provider>
  )
}

/* ---------------- Prompt (ChatGPT-style composer) ---------------- */

interface BriefFormProps {
  brief: Brief
  setBrief: (b: Brief) => void
  onSubmit: () => void
  error: string | null
  introDone: boolean
}

const MAX_PROMPT_PX = 220

function BriefForm({ brief, setBrief, onSubmit, error, introDone }: BriefFormProps) {
  const ready = brief.idea.trim().length > 0

  // Grow with the text like a chat composer, up to a cap, then scroll.
  const autosize = (el: HTMLTextAreaElement | null) => {
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, MAX_PROMPT_PX)}px`
  }

  const handleSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (ready) onSubmit()
  }

  // Enter sends, Shift+Enter adds a new line.
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      if (ready) onSubmit()
    }
  }

  return (
    <form className="brief" onSubmit={handleSubmit}>
      <Typewriter className="landing-title" phrases={HEADLINES} start={introDone} />

      <div className="composer">
        <textarea
          ref={autosize}
          autoFocus
          rows={1}
          value={brief.idea}
          onChange={(e) => {
            setBrief({ ...brief, idea: e.target.value })
            autosize(e.target)
          }}
          onKeyDown={onKey}
          placeholder="I have an idea for an app that…"
          aria-label="Describe your app idea"
        />
        <button type="submit" className="composer-send" disabled={!ready} aria-label="Find my competitors">
          <svg viewBox="0 0 24 24" aria-hidden>
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
        </button>
      </div>
      <p className="composer-hint">Mention key features and who it's for to sharpen the results.</p>

      {error && <p className="error">{error}</p>}

      <div className="examples">
        {EXAMPLES.map((ex) => (
          <button type="button" key={ex} className="chip ghost" onClick={() => setBrief({ ...brief, idea: ex })}>
            {ex}
          </button>
        ))}
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
        <GlassButton variant="secondary" label="New idea" onTap={onRestart} />
        <GlassButton
          label="Download report"
          icon="arrow"
          onTap={() => exportDoc(analysis, weaknesses, analysis.differentiators.filter((_, i) => planned.has(i)))}
        />
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

/* ---------------- Liquid glass ---------------- */

const GLASS_FONT = { fontFamily: 'var(--heading)', fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em' }

function GlassButton({
  variant = 'primary',
  ...props
}: LiquidGlassButtonProps & { variant?: 'primary' | 'secondary' }) {
  const primary = variant === 'primary'
  const dark = useContext(ThemeContext) === 'dark'
  return (
    <LiquidGlassButton
      material={primary ? 'tinted' : 'clear'}
      surface={dark ? 'dark' : 'light'}
      tint={primary ? 'var(--accent)' : '#fff'}
      textColor={primary ? 'var(--accent-ink)' : 'var(--text-h)'}
      icon={primary ? 'chevron' : 'none'}
      padding="13px 24px"
      font={GLASS_FONT}
      focusColor="var(--accent)"
      {...props}
    />
  )
}

function GlassFooter({ showHow }: { showHow: boolean }) {
  const toTop = scrollToTop
  return (
    <footer className="glass-footer">
      <div className="glass-footer-content">
        <div className="glass-footer-top">
          <div className="glass-footer-brand">
            <span className="glass-footer-logo">
              <LogoMark className="glass-footer-mark" />
              Apposition
            </span>
            <p>Know your competition before you build. App Store research, done in seconds.</p>
          </div>
          <nav className="glass-footer-links" aria-label="Footer">
            <div>
              <h3>Product</h3>
              <button type="button" onClick={toTop}>
                Analyze an idea
              </button>
              {showHow && <a href="#how">How it works</a>}
            </div>
          </nav>
        </div>
        <div className="glass-footer-divider" />
        <div className="glass-footer-bottom">
          <span>© {new Date().getFullYear()} Apposition</span>
          <GlassButton
            variant="secondary"
            label="Back to top"
            padding="8px 16px"
            font={{ ...GLASS_FONT, fontSize: 13 }}
            onTap={toTop}
          />
        </div>
      </div>
    </footer>
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
