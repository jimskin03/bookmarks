import { Note } from '@/types'
import { vaultStorage } from '@/lib/storage/vaultStorage'

export interface SearchMatch {
  note: Note
  matchType: 'title' | 'tag' | 'content'
  snippet: string
}

export const searchService = {
  async search(query: string): Promise<SearchMatch[]> {
    const q = query.trim().toLowerCase()
    if (!q) return []

    const notes = await vaultStorage.getNotes(false)
    const matches: SearchMatch[] = []

    for (const note of notes) {
      const titleLower = note.title.toLowerCase()
      const contentLower = note.content.toLowerCase()
      const tags = note.metadata?.tags || []

      if (titleLower.includes(q)) {
        matches.push({
          note,
          matchType: 'title',
          snippet: note.title
        })
      } else if (tags.some(t => t.toLowerCase().includes(q.replace(/^#/, '')))) {
        matches.push({
          note,
          matchType: 'tag',
          snippet: `Tags: ${tags.map(t => '#' + t).join(' ')}`
        })
      } else if (contentLower.includes(q)) {
        const idx = contentLower.indexOf(q)
        const start = Math.max(0, idx - 40)
        const end = Math.min(note.content.length, idx + q.length + 60)
        const snippet = (start > 0 ? '…' : '') + note.content.slice(start, end).replace(/\s+/g, ' ') + (end < note.content.length ? '…' : '')
        matches.push({
          note,
          matchType: 'content',
          snippet
        })
      }
    }

    // Rank: title matches first, then tags, then content
    return matches.sort((a, b) => {
      const order = { title: 0, tag: 1, content: 2 }
      return order[a.matchType] - order[b.matchType]
    })
  }
}
