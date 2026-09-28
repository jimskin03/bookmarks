import { beforeAll, describe, expect, it } from 'vitest'
import { graphService } from '../src/features/graph/graphService'
import { vaultStorage } from '../src/lib/storage/vaultStorage'

describe('graphService', () => {
  beforeAll(() => {
    vaultStorage.setDemoMode(true)
  })
  it('loads global graph data with nodes and edges from vault', async () => {
    const { nodes, edges } = await graphService.getGlobalGraphData()

    expect(nodes.length).toBeGreaterThan(0)
    expect(edges.length).toBeGreaterThan(0)

    const aiNode = nodes.find(n => n.title === 'Artificial Intelligence')
    expect(aiNode).toBeDefined()
    expect(aiNode!.linkCount).toBeGreaterThan(0)
  })

  it('filters local graph data to requested depth', async () => {
    const notes = await vaultStorage.getNotes(false)
    const aiNote = notes.find(n => n.title === 'Artificial Intelligence')!

    const depth1 = await graphService.getLocalGraphData(aiNote.id, 1)
    const depth2 = await graphService.getLocalGraphData(aiNote.id, 2)

    expect(depth1.nodes.length).toBeGreaterThan(0)
    expect(depth2.nodes.length).toBeGreaterThanOrEqual(depth1.nodes.length)
    expect(depth1.nodes.some(n => n.id === aiNote.id)).toBe(true)
  })

  it('builds a hierarchical mind map tree without cycles', async () => {
    const notes = await vaultStorage.getNotes(false)
    const rootNote = notes.find(n => n.title === 'Artificial Intelligence')!

    const tree = await graphService.getMindMapTree(rootNote.id)

    expect(tree).not.toBeNull()
    expect(tree!.id).toBe(rootNote.id)
    expect(tree!.title).toBe('Artificial Intelligence')
    expect(tree!.children.length).toBeGreaterThan(0)
  })
})
