import type { AnalysisResponse, AnalysisResult } from './types'

// Vite proxies /api to the C# backend (see vite.config.ts).

async function failure(res: Response) {
  // ASP.NET problem responses carry the message in "detail"; plain 400s are text.
  const body = await res.text()
  try {
    return new Error(JSON.parse(body).detail ?? body)
  } catch {
    return new Error(body || `Request failed (${res.status})`)
  }
}

export async function analyzeIdea(prompt: string): Promise<AnalysisResponse> {
  const res = await fetch('/api/analysis', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  })
  if (!res.ok) throw await failure(res)
  return res.json()
}

/** Builds the Word report on the server and saves it through the browser. */
export async function downloadReport(result: AnalysisResult, planned: number[]) {
  const res = await fetch('/api/analysis/report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ result, planned }),
  })
  if (!res.ok) throw await failure(res)

  const url = URL.createObjectURL(await res.blob())
  const link = document.createElement('a')
  link.href = url
  link.download = 'market_analysis.docx'
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
