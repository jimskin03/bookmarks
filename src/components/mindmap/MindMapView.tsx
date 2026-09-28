import React, { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import {
  GitFork,
  RotateCcw,
  ZoomIn,
  ZoomOut
} from 'lucide-react'
import { MindMapNode, Note } from '@/types'
import { graphService } from '@/features/graph/graphService'

interface MindMapViewProps {
  notes: Note[]
  activeNoteId: string | null
  onSelectNote: (noteId: string) => void
  onAddChildNote: (parentNoteId: string, childTitle: string) => void
}

export const MindMapView: React.FC<MindMapViewProps> = ({
  notes,
  activeNoteId,
  onSelectNote,
  onAddChildNote,
}) => {
  const [rootId, setRootId] = useState<string>(activeNoteId || (notes[0]?.id ?? ''))
  const [treeData, setTreeData] = useState<MindMapNode | null>(null)
  const [addChildModal, setAddChildModal] = useState<{ parentId: string; parentTitle: string } | null>(null)
  const [childTitleInput, setChildTitleInput] = useState('')

  const svgRef = useRef<SVGSVGElement>(null)
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null)

  useEffect(() => {
    if (activeNoteId && !rootId) {
      setRootId(activeNoteId)
    }
  }, [activeNoteId, rootId])

  useEffect(() => {
    if (rootId) {
      graphService.getMindMapTree(rootId).then(setTreeData)
    }
  }, [rootId])

  // D3 Tree Rendering
  useEffect(() => {
    if (!svgRef.current || !treeData) return

    const svg = d3.select(svgRef.current)
    const height = svgRef.current.clientHeight || 650

    svg.selectAll('*').remove()

    const g = svg.append('g').attr('class', 'mindmap-container')

    // Setup Zoom & Pan
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
      })

    svg.call(zoom)
    zoomBehaviorRef.current = zoom

    // Center root initially
    const initialTransform = d3.zoomIdentity.translate(120, height / 2).scale(0.9)
    svg.call(zoom.transform, initialTransform)

    // Build D3 hierarchy
    const root = d3.hierarchy<MindMapNode>(treeData)
    const treeLayout = d3.tree<MindMapNode>()
      .nodeSize([65, 240]) // vertical spacing, horizontal spacing

    treeLayout(root)

    // Draw connecting bezier curves (links)
    const linkGenerator = d3.linkHorizontal<any, any>()
      .x((d: any) => d.y)
      .y((d: any) => d.x)

    g.append('g')
      .selectAll('path')
      .data(root.links())
      .join('path')
      .attr('d', linkGenerator as any)
      .attr('fill', 'none')
      .attr('stroke', '#3b3b44')
      .attr('stroke-width', 2)

    // Draw Node Groups
    const node = g.append('g')
      .selectAll('.node')
      .data(root.descendants())
      .join('g')
      .attr('class', 'node cursor-pointer')
      .attr('transform', (d: any) => `translate(${d.y},${d.x})`)

    // Node Box / Pill
    node.append('rect')
      .attr('y', -18)
      .attr('x', -8)
      .attr('rx', 8)
      .attr('ry', 8)
      .attr('width', (d: any) => Math.max(120, d.data.title.length * 8.5 + 40))
      .attr('height', 36)
      .attr('fill', (d: any) => (d.depth === 0 ? '#7c3aed' : '#1e1e24'))
      .attr('stroke', (d: any) => (d.depth === 0 ? '#c084fc' : '#3f3f46'))
      .attr('stroke-width', (d: any) => (d.depth === 0 ? 2 : 1.2))
      .attr('class', 'hover:stroke-purple-400 transition-colors')
      .on('click', (_event, d: any) => {
        onSelectNote(d.data.id)
      })

    // Node Title Text
    node.append('text')
      .attr('x', 14)
      .attr('y', 4)
      .text((d: any) => d.data.title)
      .attr('fill', (d: any) => (d.depth === 0 ? '#ffffff' : '#e4e4e7'))
      .attr('font-size', '12px')
      .attr('font-weight', (d: any) => (d.depth === 0 ? '600' : '400'))
      .attr('pointer-events', 'none')

    // + Add Child Button on Node
    const addBtn = node.append('g')
      .attr('class', 'add-child-btn opacity-60 hover:opacity-100')
      .attr('transform', (d: any) => `translate(${Math.max(120, d.data.title.length * 8.5 + 40) - 20}, 0)`)
      .on('click', (event, d: any) => {
        event.stopPropagation()
        setAddChildModal({ parentId: d.data.id, parentTitle: d.data.title })
      })

    addBtn.append('circle')
      .attr('r', 8)
      .attr('fill', '#27272a')
      .attr('stroke', '#a855f7')
      .attr('stroke-width', 1)

    addBtn.append('text')
      .text('+')
      .attr('text-anchor', 'middle')
      .attr('dy', 3.5)
      .attr('fill', '#c084fc')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')

  }, [treeData, onSelectNote])

  const handleZoom = (factor: number) => {
    if (!svgRef.current || !zoomBehaviorRef.current) return
    d3.select(svgRef.current).transition().duration(200).call(zoomBehaviorRef.current.scaleBy, factor)
  }

  const handleReset = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return
    const height = svgRef.current.clientHeight || 650
    const initialTransform = d3.zoomIdentity.translate(120, height / 2).scale(0.9)
    d3.select(svgRef.current).transition().duration(300).call(zoomBehaviorRef.current.transform, initialTransform)
  }

  const handleCreateChildSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (addChildModal && childTitleInput.trim()) {
      onAddChildNote(addChildModal.parentId, childTitleInput.trim())
      setChildTitleInput('')
      setAddChildModal(null)
      // Refresh tree
      setTimeout(() => {
        graphService.getMindMapTree(rootId).then(setTreeData)
      }, 100)
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#101012] relative overflow-hidden select-none">
      {/* Top Controls Toolbar */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10 pointer-events-none">
        {/* Root Selector */}
        <div className="flex items-center gap-2 pointer-events-auto bg-[#18181c]/90 backdrop-blur-md p-1.5 rounded-lg border border-zinc-800 shadow-xl text-xs">
          <div className="flex items-center gap-1.5 px-2 text-zinc-400">
            <GitFork size={13} className="text-purple-400" />
            <span className="font-medium">Root Node:</span>
          </div>

          <select
            value={rootId}
            onChange={(e) => setRootId(e.target.value)}
            className="bg-zinc-900 text-zinc-200 border border-zinc-700/80 rounded px-2.5 py-1 text-xs outline-none focus:border-purple-500 cursor-pointer"
          >
            {notes.map(n => (
              <option key={n.id} value={n.id}>
                {n.title}
              </option>
            ))}
          </select>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 pointer-events-auto bg-[#18181c]/90 backdrop-blur-md p-1 rounded-lg border border-zinc-800 shadow-xl">
          <button
            onClick={() => handleZoom(1.3)}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors"
            title="Zoom In"
          >
            <ZoomIn size={14} />
          </button>
          <button
            onClick={() => handleZoom(0.7)}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors"
            title="Zoom Out"
          >
            <ZoomOut size={14} />
          </button>
          <button
            onClick={handleReset}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors"
            title="Reset View"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* SVG Canvas for Tree */}
      <svg
        ref={svgRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Add Child Note Modal */}
      {addChildModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1e] border border-zinc-700 rounded-xl p-5 w-full max-w-sm shadow-2xl">
            <h3 className="text-sm font-semibold text-zinc-100 mb-1">
              Add Connected Child Note
            </h3>
            <p className="text-xs text-zinc-400 mb-4">
              Adding child to: <strong className="text-purple-300">"{addChildModal.parentTitle}"</strong>
            </p>

            <form onSubmit={handleCreateChildSubmit} className="space-y-3">
              <input
                type="text"
                autoFocus
                value={childTitleInput}
                onChange={(e) => setChildTitleInput(e.target.value)}
                placeholder="New note title..."
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-200 outline-none focus:border-purple-500"
              />

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setAddChildModal(null)}
                  className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!childTitleInput.trim()}
                  className="px-3 py-1.5 rounded-lg text-xs bg-purple-600 hover:bg-purple-500 text-white font-medium disabled:opacity-50 transition-colors"
                >
                  Create & Connect
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tip footer */}
      <div className="absolute bottom-4 left-4 bg-[#18181c]/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-zinc-800 text-[11px] text-zinc-500 pointer-events-none">
        Click any note card to open in editor • Click + on a node to add a child branch
      </div>
    </div>
  )
}
