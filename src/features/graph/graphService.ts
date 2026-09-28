import { GraphEdge, GraphNode, MindMapNode } from '@/types'
import { vaultStorage } from '@/lib/storage/vaultStorage'

export const graphService = {
  async getGlobalGraphData(): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
    const notes = await vaultStorage.getNotes(false)
    const links = await vaultStorage.getLinks()

    const activeNoteIds = new Set(notes.map(n => n.id))

    // Count connections per note for sizing
    const connectionCounts = new Map<string, number>()
    for (const link of links) {
      if (activeNoteIds.has(link.source_note_id) && activeNoteIds.has(link.target_note_id)) {
        connectionCounts.set(link.source_note_id, (connectionCounts.get(link.source_note_id) || 0) + 1)
        connectionCounts.set(link.target_note_id, (connectionCounts.get(link.target_note_id) || 0) + 1)
      }
    }

    const nodes: GraphNode[] = notes.map(n => ({
      id: n.id,
      title: n.title,
      folder_id: n.folder_id,
      tags: n.metadata?.tags || [],
      linkCount: connectionCounts.get(n.id) || 0,
    }))

    const edges: GraphEdge[] = []
    const seenEdges = new Set<string>()

    for (const link of links) {
      if (activeNoteIds.has(link.source_note_id) && activeNoteIds.has(link.target_note_id)) {
        const edgeKey = `${link.source_note_id}->${link.target_note_id}`
        if (!seenEdges.has(edgeKey)) {
          seenEdges.add(edgeKey)
          edges.push({
            id: link.id,
            source: link.source_note_id,
            target: link.target_note_id,
          })
        }
      }
    }

    return { nodes, edges }
  },

  async getLocalGraphData(
    centerNoteId: string,
    depth: number = 1
  ): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
    const { nodes: allNodes, edges: allEdges } = await this.getGlobalGraphData()

    const includedNodeIds = new Set<string>([centerNoteId])
    let currentFrontier = new Set<string>([centerNoteId])

    // Breadth-First Search up to depth
    for (let d = 0; d < depth; d++) {
      const nextFrontier = new Set<string>()
      for (const edge of allEdges) {
        const src = typeof edge.source === 'object' ? edge.source.id : edge.source
        const tgt = typeof edge.target === 'object' ? edge.target.id : edge.target

        if (currentFrontier.has(src) && !includedNodeIds.has(tgt)) {
          includedNodeIds.add(tgt)
          nextFrontier.add(tgt)
        } else if (currentFrontier.has(tgt) && !includedNodeIds.has(src)) {
          includedNodeIds.add(src)
          nextFrontier.add(src)
        }
      }
      currentFrontier = nextFrontier
    }

    const localNodes = allNodes.filter(n => includedNodeIds.has(n.id))
    const localEdges = allEdges.filter(e => {
      const src = typeof e.source === 'object' ? e.source.id : e.source
      const tgt = typeof e.target === 'object' ? e.target.id : e.target
      return includedNodeIds.has(src) && includedNodeIds.has(tgt)
    })

    return { nodes: localNodes, edges: localEdges }
  },

  async getMindMapTree(rootNoteId: string): Promise<MindMapNode | null> {
    const notes = await vaultStorage.getNotes(false)
    const links = await vaultStorage.getLinks()

    const rootNote = notes.find(n => n.id === rootNoteId) || notes[0]
    if (!rootNote) return null

    const noteMap = new Map(notes.map(n => [n.id, n]))

    // Build adjacency list (bi-directional for mind map navigation)
    const adj = new Map<string, Set<string>>()
    for (const l of links) {
      if (noteMap.has(l.source_note_id) && noteMap.has(l.target_note_id)) {
        if (!adj.has(l.source_note_id)) adj.set(l.source_note_id, new Set())
        if (!adj.has(l.target_note_id)) adj.set(l.target_note_id, new Set())
        adj.get(l.source_note_id)!.add(l.target_note_id)
        adj.get(l.target_note_id)!.add(l.source_note_id)
      }
    }

    const visited = new Set<string>([rootNote.id])

    function buildNode(currentId: string, currentDepth: number): MindMapNode {
      const note = noteMap.get(currentId)!
      const neighbors = Array.from(adj.get(currentId) || [])
      const children: MindMapNode[] = []

      // Avoid infinite depth or cycles
      if (currentDepth < 4) {
        for (const neighborId of neighbors) {
          if (!visited.has(neighborId)) {
            visited.add(neighborId)
            children.push(buildNode(neighborId, currentDepth + 1))
          }
        }
      }

      return {
        id: note.id,
        title: note.title,
        tags: note.metadata?.tags,
        children,
        depth: currentDepth,
        isCollapsed: false,
      }
    }

    return buildNode(rootNote.id, 0)
  }
}
