import React, { useEffect, useMemo, useRef, useState } from 'react'
import * as d3 from 'd3'
import {
  Filter,
  RotateCcw,
  Search,
  ZoomIn,
  ZoomOut
} from 'lucide-react'
import { GraphEdge, GraphNode, GraphScope } from '@/types'
import { graphService } from '@/features/graph/graphService'

interface GraphViewProps {
  activeNoteId: string | null
  onSelectNote: (noteId: string) => void
}

export const GraphView: React.FC<GraphViewProps> = ({
  activeNoteId,
  onSelectNote,
}) => {
  const [scope, setScope] = useState<GraphScope>(activeNoteId ? 'local' : 'global')
  const [localDepth, setLocalDepth] = useState<number>(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [hideIsolated, setHideIsolated] = useState(false)
  const [rawNodes, setRawNodes] = useState<GraphNode[]>([])
  const [rawEdges, setRawEdges] = useState<GraphEdge[]>([])
  const [, setHoveredNodeId] = useState<string | null>(null)

  const svgRef = useRef<SVGSVGElement>(null)
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const gRef = useRef<SVGGElement | null>(null)

  // Fetch graph data when scope, activeNoteId, or depth changes
  useEffect(() => {
    let active = true

    async function load() {
      if (scope === 'local' && activeNoteId) {
        const data = await graphService.getLocalGraphData(activeNoteId, localDepth)
        if (active) {
          setRawNodes(data.nodes)
          setRawEdges(data.edges)
        }
      } else {
        const data = await graphService.getGlobalGraphData()
        if (active) {
          setRawNodes(data.nodes)
          setRawEdges(data.edges)
        }
      }
    }

    load()
    return () => {
      active = false
    }
  }, [scope, activeNoteId, localDepth])

  // Filter nodes based on search and isolation
  const { filteredNodes, filteredEdges } = useMemo(() => {
    let nodes = [...rawNodes]
    let edges = [...rawEdges]

    if (hideIsolated) {
      nodes = nodes.filter(n => n.linkCount > 0)
      const validIds = new Set(nodes.map(n => n.id))
      edges = edges.filter(e => {
        const s = typeof e.source === 'object' ? e.source.id : e.source
        const t = typeof e.target === 'object' ? e.target.id : e.target
        return validIds.has(s) && validIds.has(t)
      })
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      nodes = nodes.map(n => ({
        ...n,
        isSearchMatch: n.title.toLowerCase().includes(q)
      })) as GraphNode[]
    }

    return { filteredNodes: nodes, filteredEdges: edges }
  }, [rawNodes, rawEdges, hideIsolated, searchQuery])

  // D3 Force Simulation Setup
  useEffect(() => {
    if (!svgRef.current || filteredNodes.length === 0) return

    const svg = d3.select(svgRef.current)
    const width = svgRef.current.clientWidth || 800
    const height = svgRef.current.clientHeight || 600

    svg.selectAll('*').remove()

    const g = svg.append('g').attr('class', 'graph-container')
    gRef.current = g.node()

    // Setup Zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
      })

    svg.call(zoom)
    zoomBehaviorRef.current = zoom

    // Clone data for D3 mutation
    const simulationNodes = filteredNodes.map(d => ({ ...d }))
    const simulationEdges = filteredEdges.map(d => ({
      ...d,
      source: typeof d.source === 'object' ? d.source.id : d.source,
      target: typeof d.target === 'object' ? d.target.id : d.target
    }))

    // Force Simulation
    const simulation = d3.forceSimulation<any>(simulationNodes)
      .force('link', d3.forceLink<any, any>(simulationEdges).id((d: any) => d.id).distance(90))
      .force('charge', d3.forceManyBody().strength(-240))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide().radius(28))

    // Draw Edges
    const link = g.append('g')
      .attr('stroke', '#3f3f46')
      .attr('stroke-opacity', 0.6)
      .selectAll('line')
      .data(simulationEdges)
      .join('line')
      .attr('stroke-width', 1.5)

    // Draw Nodes
    const node = g.append('g')
      .selectAll('.node')
      .data(simulationNodes)
      .join('g')
      .attr('class', 'node cursor-pointer')
      .call(
        d3.drag<any, any>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart()
            d.fx = d.x
            d.fy = d.y
          })
          .on('drag', (event, d) => {
            d.fx = event.x
            d.fy = event.y
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0)
            d.fx = null
            d.fy = null
          })
      )

    // Node Circles
    node.append('circle')
      .attr('r', (d: any) => Math.max(6, Math.min(16, 6 + (d.linkCount || 0) * 1.8)))
      .attr('fill', (d: any) => {
        if (d.id === activeNoteId) return '#a855f7' // Primary active note
        if ((d as any).isSearchMatch) return '#fbbf24' // Search match
        return '#6366f1' // Connected notes
      })
      .attr('stroke', (d: any) => (d.id === activeNoteId ? '#ffffff' : '#1e1e24'))
      .attr('stroke-width', (d: any) => (d.id === activeNoteId ? 2.5 : 1.5))
      .attr('class', 'transition-all duration-200')

    // Node Text Labels
    node.append('text')
      .text((d: any) => d.title)
      .attr('x', 10)
      .attr('y', 4)
      .attr('font-size', '11px')
      .attr('fill', (d: any) => (d.id === activeNoteId ? '#f3e8ff' : '#a1a1aa'))
      .attr('font-family', 'sans-serif')
      .attr('font-weight', (d: any) => (d.id === activeNoteId ? '600' : '400'))
      .attr('pointer-events', 'none')

    // Interactive Node Events
    node
      .on('click', (_event, d: any) => {
        onSelectNote(d.id)
      })
      .on('mouseenter', (_event, d: any) => {
        setHoveredNodeId(d.id)

        // Highlight connected links
        link
          .attr('stroke', (l: any) => {
            const s = l.source.id || l.source
            const t = l.target.id || l.target
            return s === d.id || t === d.id ? '#c084fc' : '#27272a'
          })
          .attr('stroke-width', (l: any) => {
            const s = l.source.id || l.source
            const t = l.target.id || l.target
            return s === d.id || t === d.id ? 2.5 : 1
          })
          .attr('stroke-opacity', (l: any) => {
            const s = l.source.id || l.source
            const t = l.target.id || l.target
            return s === d.id || t === d.id ? 1 : 0.2
          })
      })
      .on('mouseleave', () => {
        setHoveredNodeId(null)
        link
          .attr('stroke', '#3f3f46')
          .attr('stroke-width', 1.5)
          .attr('stroke-opacity', 0.6)
      })

    // Tick updates
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y)

      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`)
    })

    return () => {
      simulation.stop()
    }
  }, [filteredNodes, filteredEdges, activeNoteId, onSelectNote])

  // Zoom controls
  const handleZoom = (factor: number) => {
    if (!svgRef.current || !zoomBehaviorRef.current) return
    d3.select(svgRef.current)
      .transition()
      .duration(250)
      .call(zoomBehaviorRef.current.scaleBy, factor)
  }

  const handleResetZoom = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return
    d3.select(svgRef.current)
      .transition()
      .duration(350)
      .call(zoomBehaviorRef.current.transform, d3.zoomIdentity)
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#101012] relative overflow-hidden select-none">
      {/* Top Floating Graph Controls Bar */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10 pointer-events-none">
        {/* Left: Scope toggles & Depth */}
        <div className="flex items-center gap-2 pointer-events-auto bg-[#18181c]/90 backdrop-blur-md p-1.5 rounded-lg border border-zinc-800 shadow-xl">
          <div className="flex items-center bg-zinc-900 rounded p-0.5">
            <button
              onClick={() => setScope('global')}
              className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                scope === 'global' ? 'bg-purple-600 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Global Graph
            </button>
            <button
              onClick={() => setScope('local')}
              disabled={!activeNoteId}
              className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                scope === 'local'
                  ? 'bg-purple-600 text-white shadow'
                  : activeNoteId ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-600 cursor-not-allowed'
              }`}
              title={activeNoteId ? 'Focused on current note' : 'Select a note first'}
            >
              Local Graph
            </button>
          </div>

          {/* Depth slider if Local */}
          {scope === 'local' && (
            <div className="flex items-center gap-1.5 px-2 border-l border-zinc-800 text-xs text-zinc-400">
              <span>Depth:</span>
              <span className="font-mono text-purple-400 font-semibold">{localDepth}</span>
              <input
                type="range"
                min="1"
                max="3"
                value={localDepth}
                onChange={(e) => setLocalDepth(Number(e.target.value))}
                className="w-16 accent-purple-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
              />
            </div>
          )}

          {/* Toggle isolated */}
          <button
            onClick={() => setHideIsolated(!hideIsolated)}
            className={`p-1.5 rounded text-xs transition-colors border ${
              hideIsolated
                ? 'bg-purple-950/60 text-purple-300 border-purple-700/60'
                : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
            }`}
            title={hideIsolated ? 'Showing connected nodes only' : 'Hide isolated nodes'}
          >
            <Filter size={13} />
          </button>
        </div>

        {/* Right: Search in Graph & Zoom Controls */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="flex items-center bg-[#18181c]/90 backdrop-blur-md px-2.5 py-1 rounded-lg border border-zinc-800 shadow-xl text-xs text-zinc-300">
            <Search size={13} className="text-zinc-500 mr-1.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Find node..."
              className="bg-transparent outline-none w-28 text-zinc-200 placeholder-zinc-500 text-xs"
            />
          </div>

          <div className="flex items-center bg-[#18181c]/90 backdrop-blur-md p-1 rounded-lg border border-zinc-800 shadow-xl gap-0.5">
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
              onClick={handleResetZoom}
              className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors"
              title="Reset View"
            >
              <RotateCcw size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* D3 Canvas / SVG container */}
      <svg
        ref={svgRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Floating Graph Legend & Stats */}
      <div className="absolute bottom-4 left-4 bg-[#18181c]/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-zinc-800 text-[11px] text-zinc-400 flex items-center gap-4 pointer-events-none select-none">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
          <span>Active note</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
          <span>Connected note</span>
        </div>
        <div>
          <span>{filteredNodes.length} nodes</span> • <span>{filteredEdges.length} connections</span>
        </div>
      </div>
    </div>
  )
}
