import type { Analysis, Brief } from './types'

// Mock until the backend exposes POST /api/analyze. Swap the body for:
//   const res = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(brief) })
//   if (!res.ok) throw new Error(await res.text())
//   return res.json()
export async function analyzeIdea(brief: Brief): Promise<Analysis> {
  await new Promise((r) => setTimeout(r, 1200))
  return {
    ...MOCK,
    summary: `An app that ${brief.idea.trim().replace(/[.\s]+$/, '')}${brief.audience.trim() ? `, built for ${brief.audience.trim()}` : ''}.`,
  }
}

const MOCK: Analysis = {
  summary: '',
  saturation: 62,
  competitors: [
    {
      id: '1',
      name: 'Sproutly',
      developer: 'Greenhouse Labs',
      genre: 'Lifestyle',
      price: 0,
      rating: 4.3,
      ratingCount: 18400,
      similarity: 0.87,
      overlap: ['Plant listings', 'Local map', 'Messaging'],
      praises: ['Friendly community', 'Clean listing flow'],
      weaknesses: [
        { issue: 'Swaps fall through with no accountability', mentions: 412, severity: 'high', howToBeat: 'Add swap confirmations and a reliability score on profiles.' },
        { issue: 'Map is empty outside big cities', mentions: 230, severity: 'medium', howToBeat: 'Show a wider radius and allow shipping swaps for rural users.' },
      ],
    },
    {
      id: '2',
      name: 'LeafSwap',
      developer: 'LeafSwap Inc.',
      genre: 'Social Networking',
      price: 0,
      rating: 3.6,
      ratingCount: 5200,
      similarity: 0.81,
      overlap: ['Plant listings', 'Messaging'],
      praises: ['Big catalogue of species', 'Good photo quality'],
      weaknesses: [
        { issue: 'Constant ads and paywalled messaging', mentions: 690, severity: 'high', howToBeat: 'Keep chat free; monetise with optional premium care tools instead.' },
        { issue: 'App crashes when uploading photos', mentions: 180, severity: 'medium', howToBeat: 'Compress images client-side and upload in the background.' },
      ],
    },
    {
      id: '3',
      name: 'Cutting Club',
      developer: 'Rootbound Studio',
      genre: 'Lifestyle',
      price: 2.99,
      rating: 4.6,
      ratingCount: 2100,
      similarity: 0.74,
      overlap: ['Cuttings exchange', 'Community groups'],
      praises: ['Great care guides', 'No ads'],
      weaknesses: [
        { issue: 'Upfront price scares off new users', mentions: 95, severity: 'medium', howToBeat: 'Launch free with a generous core; charge only for extras.' },
        { issue: 'Tiny user base, few swaps nearby', mentions: 140, severity: 'high', howToBeat: 'Seed supply by partnering with local nurseries and plant shops.' },
      ],
    },
    {
      id: '4',
      name: 'PlantPal Market',
      developer: 'Pal Apps',
      genre: 'Shopping',
      price: 0,
      rating: 4.1,
      ratingCount: 26700,
      similarity: 0.63,
      overlap: ['Plant listings', 'Local map'],
      praises: ['Lots of sellers', 'Fast search'],
      weaknesses: [
        { issue: 'Feels like a store, not a community', mentions: 150, severity: 'low', howToBeat: 'Lead with people and stories, not prices.' },
        { issue: 'Scam listings and fake photos', mentions: 310, severity: 'high', howToBeat: 'Verify profiles and require in-app photos taken live.' },
      ],
    },
    {
      id: '5',
      name: 'GreenThumb Care',
      developer: 'Thumbworks',
      genre: 'Education',
      price: 0,
      rating: 4.7,
      ratingCount: 88000,
      similarity: 0.48,
      overlap: ['Care reminders'],
      praises: ['Accurate plant ID', 'Helpful reminders'],
      weaknesses: [
        { issue: 'No way to connect with other plant owners', mentions: 75, severity: 'low', howToBeat: 'Make community the core, with care tools as a bonus.' },
      ],
    },
    {
      id: '6',
      name: 'Neighbourly',
      developer: 'Block Party Co.',
      genre: 'Social Networking',
      price: 0,
      rating: 3.9,
      ratingCount: 41000,
      similarity: 0.41,
      overlap: ['Local map', 'Messaging'],
      praises: ['Active local groups'],
      weaknesses: [
        { issue: 'Too general — plant posts get buried', mentions: 60, severity: 'low', howToBeat: 'Stay niche: every screen is built for plant people.' },
      ],
    },
  ],
  differentiators: [
    { type: 'add', title: 'Reliability score', detail: 'Rate every completed swap so no-shows are visible. The top complaint across 3 competitors.' },
    { type: 'add', title: 'Nursery partnerships', detail: 'Seed early supply so new users always see swaps nearby.' },
    { type: 'change', title: 'Free messaging, forever', detail: 'LeafSwap users are angry about paywalled chat — make it a selling point.' },
    { type: 'change', title: 'Ship-a-cutting option', detail: 'Unlock rural users that local-only apps ignore.' },
    { type: 'remove', title: 'Price tags on listings', detail: 'Keep it swap-only to feel like a community, not a marketplace.' },
  ],
}
