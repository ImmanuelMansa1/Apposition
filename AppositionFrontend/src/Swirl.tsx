import { useEffect, useRef } from 'react'

// Simple 24×24 stroke glyphs for the app-icon tiles (chat, pin, cart, music, heart, star, camera, play, chart).
const GLYPHS = [
  'M4 5h16v10H9l-5 4z',
  'M12 21s-6-6-6-11a6 6 0 0 1 12 0c0 5-6 11-6 11zM14.5 10a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z',
  'M3 4h2l2.5 11h10L20 8H6.5M9 20h.01M17 20h.01',
  'M9 18V5l11-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM20 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
  'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z',
  'M12 3l2.8 5.8 6.2.9-4.5 4.4 1 6.2L12 17.4 6.5 20.3l1-6.2L3 9.7l6.2-.9z',
  'M4 8h3l2-3h6l2 3h3v11H4zM15.5 13a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0z',
  'M8 5l11 7-11 7z',
  'M4 20V10M10 20V4M16 20v-7',
]

const LIGHT = ['#1d3374', '#3354b8', '#0f121b', '#7d8fb8']
const DARK = ['#2c4aa6', '#3354b8', '#5a74c9', '#8fa3e0']

const ARMS = 3
const PER_ARM = 24
const FLOW = 0.032 // how fast tiles travel outward (fraction of the arm per second)
const SPIN = 0.09 // whole-spiral rotation, radians per second
const GHOSTS = 5 // motion-blur copies behind fast outer tiles

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/**
 * Full-screen spiral of app-icon tiles flowing out from a clear centre,
 * where the idea prompt sits. Fades out and stops drawing when inactive.
 */
export default function Swirl({ active }: { active: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!active) return
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const glyphs = GLYPHS.map((d) => new Path2D(d))
    const dark = matchMedia('(prefers-color-scheme: dark)')
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches
    let w = 0
    let h = 0

    const resize = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2)
      w = canvas.clientWidth
      h = canvas.clientHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const tile = (arm: number, i: number, u: number, t: number, alpha: number, colors: string[]) => {
      const cx = w / 2
      const cy = h / 2
      const clear = Math.max(Math.min(w, h) * 0.3, 190)
      const far = Math.hypot(w, h) / 2 + 60
      const r = clear + (far - clear) * Math.pow(u, 1.25)
      const a = (arm * 2 * Math.PI) / ARMS + u * 1.7 * Math.PI + t * SPIN
      const x = cx + r * Math.cos(a) * 1.2
      const y = cy + r * Math.sin(a) * 0.95
      const size = 10 + 44 * u

      ctx.save()
      ctx.globalAlpha = alpha
      ctx.translate(x, y)
      ctx.rotate(a * 0.35)
      ctx.fillStyle = colors[(arm * 5 + i) % colors.length]
      ctx.beginPath()
      ctx.roundRect(-size / 2, -size / 2, size, size, size * 0.26)
      ctx.fill()
      if (size > 18) {
        const s = (size * 0.55) / 24
        ctx.scale(s, s)
        ctx.translate(-12, -12)
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 2
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.stroke(glyphs[(arm * 7 + i * 3) % glyphs.length])
      }
      ctx.restore()
    }

    const draw = (t: number) => {
      const colors = dark.matches ? DARK : LIGHT
      ctx.clearRect(0, 0, w, h)
      for (let arm = 0; arm < ARMS; arm++) {
        for (let i = 0; i < PER_ARM; i++) {
          const u = (i / PER_ARM + t * FLOW) % 1
          const alpha = smooth(0, 0.12, u) * (1 - smooth(0.82, 1, u))
          if (u > 0.5) {
            for (let g = GHOSTS; g >= 1; g--) {
              const gu = u - g * 0.009
              if (gu > 0) tile(arm, i, gu, t - g * 0.03, alpha * 0.1 * (1 - g / (GHOSTS + 1)), colors)
            }
          }
          tile(arm, i, u, t, alpha, colors)
        }
      }
    }

    resize()
    addEventListener('resize', resize)

    let frame = 0
    const start = performance.now()
    const loop = (now: number) => {
      draw((now - start) / 1000)
      frame = requestAnimationFrame(loop)
    }
    if (still) draw(8)
    else frame = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(frame)
      removeEventListener('resize', resize)
    }
  }, [active])

  return <canvas ref={ref} className={`swirl${active ? ' on' : ''}`} aria-hidden />
}
