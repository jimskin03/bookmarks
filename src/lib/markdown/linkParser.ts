export interface ParsedWikiLink {
  targetTitle: string
  alias?: string
  raw: string
  startIndex: number
  endIndex: number
}

/**
 * Extracts all [[Note Title]] and [[Note Title|Alias]] links from markdown content.
 * Gracefully ignores code blocks (fenced ``` and inline `).
 */
export function extractWikiLinks(content: string): ParsedWikiLink[] {
  if (!content) return []

  // Remove fenced code blocks and inline code to prevent false positives
  const sanitized = content.replace(/```[\s\S]*?```/g, (match) => ' '.repeat(match.length))
                           .replace(/`[^`]+`/g, (match) => ' '.repeat(match.length))

  const linkRegex = /\[\[([^[\]|]+?)(?:\|([^[\]]+?))?\]\]/g
  const links: ParsedWikiLink[] = []
  let match: RegExpExecArray | null

  while ((match = linkRegex.exec(sanitized)) !== null) {
    const raw = match[0]
    const targetTitle = match[1].trim()
    const alias = match[2] ? match[2].trim() : undefined

    if (targetTitle) {
      links.push({
        targetTitle,
        alias,
        raw,
        startIndex: match.index,
        endIndex: match.index + raw.length,
      })
    }
  }

  return links
}

/**
 * Extracts hashtags such as #research, #ai, #project/eastern-paradise
 * Ignores Markdown headings (e.g. "# Heading") and hex colors.
 */
export function extractTags(content: string): string[] {
  if (!content) return []

  // Exclude code blocks
  const sanitized = content.replace(/```[\s\S]*?```/g, '')
                           .replace(/`[^`]+`/g, '')

  // Matches #tag, but not at the start of a line followed by a space (which is a heading)
  const tagRegex = /(?:^|\s)#([a-zA-Z0-9_\-\/]+)(?=\s|$|[.,!?;:])/g
  const tags = new Set<string>()
  let match: RegExpExecArray | null

  while ((match = tagRegex.exec(sanitized)) !== null) {
    const tag = match[1].trim()
    // Exclude single characters or pure numbers
    if (tag && !/^\d+$/.test(tag)) {
      tags.add(tag)
    }
  }

  return Array.from(tags).sort()
}

/**
 * Extracts a concise snippet surrounding a target link for backlinks context.
 */
export function extractContextSnippet(content: string, targetTitle: string, radius = 70): string {
  if (!content || !targetTitle) return ''

  const lowerContent = content.toLowerCase()
  const lowerTarget = targetTitle.toLowerCase()

  // Find occurrences of [[targetTitle
  const pattern = new RegExp(`\\[\\[${escapeRegex(lowerTarget)}(?:\\|[^\\]]+)?\\]\\]`, 'i')
  const match = pattern.exec(content)

  if (!match) {
    // If not found as exact link, fallback to plain mention
    const plainIdx = lowerContent.indexOf(lowerTarget)
    if (plainIdx === -1) return content.slice(0, 100).trim()
    const start = Math.max(0, plainIdx - radius)
    const end = Math.min(content.length, plainIdx + targetTitle.length + radius)
    return (start > 0 ? '…' : '') + content.slice(start, end).replace(/\s+/g, ' ').trim() + (end < content.length ? '…' : '')
  }

  const linkStart = match.index
  const linkEnd = linkStart + match[0].length

  const start = Math.max(0, linkStart - radius)
  const end = Math.min(content.length, linkEnd + radius)

  let snippet = content.slice(start, end).replace(/\s+/g, ' ')
  if (start > 0) snippet = '…' + snippet
  if (end < content.length) snippet = snippet + '…'

  return snippet
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'untitled'
}
