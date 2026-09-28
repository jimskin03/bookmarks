import { BacklinkItem, OutgoingLinkItem } from '@/types'
import { vaultStorage } from '@/lib/storage/vaultStorage'
import { extractContextSnippet, extractWikiLinks } from '@/lib/markdown/linkParser'

export const linkService = {
  async getBacklinks(noteId: string): Promise<BacklinkItem[]> {
    const allNotes = await vaultStorage.getNotes(false)
    const targetNote = allNotes.find(n => n.id === noteId)
    if (!targetNote) return []

    const links = await vaultStorage.getLinks()
    const incomingLinks = links.filter(l => l.target_note_id === noteId)

    const backlinks: BacklinkItem[] = []
    for (const link of incomingLinks) {
      const sourceNote = allNotes.find(n => n.id === link.source_note_id)
      if (sourceNote) {
        const snippet = extractContextSnippet(sourceNote.content, targetNote.title)
        backlinks.push({
          sourceNote,
          snippet,
          linkText: link.link_text || undefined
        })
      }
    }

    return backlinks
  },

  async getOutgoingLinks(noteId: string): Promise<OutgoingLinkItem[]> {
    const allNotes = await vaultStorage.getNotes(false)
    const currentNote = allNotes.find(n => n.id === noteId)
    if (!currentNote) return []

    const parsedLinks = extractWikiLinks(currentNote.content)
    const titleToNoteMap = new Map(allNotes.map(n => [n.title.toLowerCase().trim(), n]))

    const outgoing: OutgoingLinkItem[] = []
    const seen = new Set<string>()

    for (const pl of parsedLinks) {
      const normalized = pl.targetTitle.toLowerCase().trim()
      if (seen.has(normalized)) continue
      seen.add(normalized)

      const target = titleToNoteMap.get(normalized)
      outgoing.push({
        targetTitle: pl.targetTitle,
        targetNote: target,
        exists: !!target
      })
    }

    return outgoing
  }
}
