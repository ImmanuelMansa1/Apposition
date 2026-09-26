export interface Brief {
  idea: string
  features: string[]
  audience: string
}

export type Severity = 'high' | 'medium' | 'low'

export interface Weakness {
  issue: string
  mentions: number
  severity: Severity
  howToBeat: string
}

export interface Competitor {
  id: string
  name: string
  developer: string
  genre: string
  price: number
  rating: number
  ratingCount: number
  iconUrl?: string
  /** Cosine similarity to the idea, 0–1 */
  similarity: number
  overlap: string[]
  praises: string[]
  weaknesses: Weakness[]
}

export interface Differentiator {
  type: 'add' | 'change' | 'remove'
  title: string
  detail: string
}

export interface Analysis {
  summary: string
  /** How crowded the market is, 0–100 */
  saturation: number
  competitors: Competitor[]
  differentiators: Differentiator[]
}
