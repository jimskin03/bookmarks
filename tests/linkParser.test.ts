import { describe, expect, it } from 'vitest'
import {
  extractContextSnippet,
  extractTags,
  extractWikiLinks,
  generateSlug
} from '../src/lib/markdown/linkParser'

describe('linkParser', () => {
  it('extracts basic [[wiki-links]]', () => {
    const markdown = 'Here is a reference to [[Artificial Intelligence]] and another to [[AI Agents]].'
    const links = extractWikiLinks(markdown)

    expect(links).toHaveLength(2)
    expect(links[0].targetTitle).toBe('Artificial Intelligence')
    expect(links[1].targetTitle).toBe('AI Agents')
  })

  it('extracts [[wiki-links|with alias]]', () => {
    const markdown = 'Read our research on [[Artificial Intelligence|our AI models]].'
    const links = extractWikiLinks(markdown)

    expect(links).toHaveLength(1)
    expect(links[0].targetTitle).toBe('Artificial Intelligence')
    expect(links[0].alias).toBe('our AI models')
  })

  it('ignores wiki-links inside code blocks', () => {
    const markdown = `
Normal link: [[Active Note]]
\`\`\`
code block: [[Ignored In Fenced]]
\`\`\`
inline: \`[[Ignored In Inline]]\`
`
    const links = extractWikiLinks(markdown)

    expect(links).toHaveLength(1)
    expect(links[0].targetTitle).toBe('Active Note')
  })

  it('extracts hashtags while ignoring markdown headings', () => {
    const markdown = `
# Markdown Heading 1
Here is #research and #project/eastern-paradise.
## Heading 2
Also #ai #simulation.
`
    const tags = extractTags(markdown)

    expect(tags).toContain('research')
    expect(tags).toContain('project/eastern-paradise')
    expect(tags).toContain('ai')
    expect(tags).toContain('simulation')
    expect(tags).not.toContain('Markdown')
    expect(tags).not.toContain('Heading')
  })

  it('extracts context snippet around target link for backlinks', () => {
    const markdown = 'Before text. In the CryptGreg architecture, modern autonomous entities combine [[Neural Networks]] with persistent memory vaults. After text.'
    const snippet = extractContextSnippet(markdown, 'Neural Networks')

    expect(snippet).toContain('Neural Networks')
    expect(snippet).toContain('CryptGreg')
  })

  it('generates clean slug from title', () => {
    expect(generateSlug('Artificial Intelligence')).toBe('artificial-intelligence')
    expect(generateSlug('JEV & Token Economics! (2026)')).toBe('jev-token-economics-2026')
  })
})
