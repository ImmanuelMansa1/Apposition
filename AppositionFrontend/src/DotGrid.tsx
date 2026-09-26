import { useEffect, useRef } from 'react'

// Page background after the Framer "Dots" component (dots + lines grid at its defaults): a faint
// grid whose dots brighten near the cursor. Drawn on one fixed canvas instead of a div per dot,
// and it only animates while dots are changing.
const COLOR = '#9CA3AF'
const DOT_SIZE = 4
const SPACING = 60
const RADIUS = 150
const MAX_OPACITY = 1
const REST_OPACITY = 0.15
const EASE = 0.2 // per-frame approach to the target, ≈ the original's 0.2s opacity transition

export default function DotGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const mouse = { x: -1e4, y: -1e4 }
    let cols = 0
    let rows = 0
    let opacity = new Float32Array(0)
    let frame = 0

    const resize = () => {
      const dpr = Math.max(1, window.devicePixelRatio || 1)
      const w = window.innerWidth
      const h = window.innerHeight
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      cols = Math.ceil(w / SPACING)
      rows = Math.ceil(h / SPACING)
      opacity = new Float32Array(cols * rows).fill(REST_OPACITY)
      draw()
    }

    // Returns true while any dot is still easing toward its target.
    const draw = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      ctx.clearRect(0, 0, w, h)
      ctx.fillStyle = COLOR
      ctx.strokeStyle = COLOR
      ctx.lineWidth = 1

      ctx.globalAlpha = REST_OPACITY
      ctx.beginPath()
      for (let c = 0; c < cols; c++) {
        const x = c * SPACING + SPACING / 2
        ctx.moveTo(x, 0)
        ctx.lineTo(x, h)
      }
      for (let r = 0; r < rows; r++) {
        const y = r * SPACING + SPACING / 2
        ctx.moveTo(0, y)
        ctx.lineTo(w, y)
      }
      ctx.stroke()

      let moving = false
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = c * SPACING + SPACING / 2
          const y = r * SPACING + SPACING / 2
          const d = Math.hypot(mouse.x - x, mouse.y - y)
          const target = d > RADIUS ? REST_OPACITY : Math.max(REST_OPACITY, (1 - d / RADIUS) * MAX_OPACITY)
          const i = r * cols + c
          const next = opacity[i] + (target - opacity[i]) * EASE
          opacity[i] = Math.abs(target - next) < 0.005 ? target : next
          if (opacity[i] !== target) moving = true
          ctx.globalAlpha = opacity[i]
          ctx.beginPath()
          ctx.arc(x, y, DOT_SIZE / 2, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      ctx.globalAlpha = 1
      return moving
    }

    const loop = () => {
      frame = draw() ? requestAnimationFrame(loop) : 0
    }
    const kick = () => {
      if (!frame) frame = requestAnimationFrame(loop)
    }
    const onMove = (e: MouseEvent) => {
      mouse.x = e.clientX
      mouse.y = e.clientY
      kick()
    }
    const onLeave = () => {
      mouse.x = mouse.y = -1e4
      kick()
    }

    resize()
    window.addEventListener('resize', resize)
    window.addEventListener('mousemove', onMove)
    document.documentElement.addEventListener('mouseleave', onLeave)
    return () => {
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMove)
      document.documentElement.removeEventListener('mouseleave', onLeave)
      cancelAnimationFrame(frame)
    }
  }, [])

  return <canvas ref={canvasRef} className="dot-grid" aria-hidden />
}
