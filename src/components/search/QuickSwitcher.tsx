import React, { useEffect, useRef, useState } from 'react'
import {
  BookOpen,
  Command,
  Download,
  FilePlus,
  GitFork,
  Network,
  Search,
  X
} from 'lucide-react'
import { Note, ViewMode } from '@/types'
import { searchService } from '@/features/search/searchService'

interface QuickSwitcherProps {
  isOpen: boolean
  notes: Note[]
  onClose: () => void
  onSelectNote: (noteId: string) => void
  onCreateNewNote: () => void
  onViewModeChange: (mode: ViewMode) => void
  onOpenExportModal: () => void
}

interface PaletteItem {
  id: string
  title: string
  subtitle?: string
  icon: React.ReactNode
  type: 'note' | 'command'
  action: () => void
}

export const QuickSwitcher: React.FC<QuickSwitcherProps> = ({
  isOpen,
  notes,
  onClose,
  onSelectNote,
  onCreateNewNote,
  onViewModeChange,
  onOpenExportModal,
}) => {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [searchResults, setSearchResults] = useState<PaletteItem[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus on open
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Build commands and notes list
  useEffect(() => {
    const q = query.trim().toLowerCase()

    const commandItems: PaletteItem[] = [
      {
        id: 'cmd-new-note',
        title: 'Create new note',
        subtitle: 'Add a new Markdown note to your vault',
        icon: <FilePlus size={15} className="text-purple-400" />,
        type: 'command',
        action: () => {
          onClose()
          onCreateNewNote()
        }
      },
      {
        id: 'cmd-graph',
        title: 'Open Global Graph',
        subtitle: 'Explore full knowledge graph connections',
        icon: <Network size={15} className="text-indigo-400" />,
        type: 'command',
        action: () => {
          onClose()
          onViewModeChange('graph')
        }
      },
      {
        id: 'cmd-mindmap',
        title: 'Open Mind Map',
        subtitle: 'View hierarchical knowledge tree',
        icon: <GitFork size={15} className="text-emerald-400" />,
        type: 'command',
        action: () => {
          onClose()
          onViewModeChange('mindmap')
        }
      },
      {
        id: 'cmd-export',
        title: 'Export Vault',
        subtitle: 'Download Obsidian-compatible ZIP archive',
        icon: <Download size={15} className="text-amber-400" />,
        type: 'command',
        action: () => {
          onClose()
          onOpenExportModal()
        }
      }
    ]

    if (!q) {
      // Show commands + recent notes
      const recentNoteItems: PaletteItem[] = notes.slice(0, 6).map(n => ({
        id: n.id,
        title: n.title,
        subtitle: n.metadata?.tags?.length ? `Tags: ${n.metadata.tags.map(t => '#' + t).join(' ')}` : undefined,
        icon: <BookOpen size={15} className="text-zinc-400" />,
        type: 'note',
        action: () => {
          onClose()
          onSelectNote(n.id)
        }
      }))
      setSearchResults([...recentNoteItems, ...commandItems])
      setSelectedIndex(0)
    } else {
      // Search matching notes
      searchService.search(q).then(matches => {
        const noteItems: PaletteItem[] = matches.slice(0, 8).map(m => ({
          id: m.note.id,
          title: m.note.title,
          subtitle: m.snippet,
          icon: <BookOpen size={15} className="text-purple-400" />,
          type: 'note',
          action: () => {
            onClose()
            onSelectNote(m.note.id)
          }
        }))

        const matchingCommands = commandItems.filter(c =>
          c.title.toLowerCase().includes(q) || (c.subtitle && c.subtitle.toLowerCase().includes(q))
        )

        setSearchResults([...noteItems, ...matchingCommands])
        setSelectedIndex(0)
      })
    }
  }, [query, notes, onClose, onSelectNote, onCreateNewNote, onViewModeChange, onOpenExportModal])

  // Key navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => (prev + 1) % Math.max(1, searchResults.length))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => (prev - 1 + searchResults.length) % Math.max(1, searchResults.length))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (searchResults[selectedIndex]) {
        searchResults[selectedIndex].action()
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-start justify-center pt-20 px-4"
      onClick={onClose}
    >
      <div
        className="bg-[#18181c] border border-zinc-700/80 rounded-xl shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-zinc-800 gap-3">
          <Search size={18} className="text-purple-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a note title, #tag, content, or command..."
            className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-500 outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 text-zinc-500 hover:text-zinc-300 rounded"
          >
            <X size={16} />
          </button>
        </div>

        {/* Results list */}
        <div className="max-h-80 overflow-y-auto p-1.5 space-y-0.5 custom-scrollbar">
          {searchResults.length === 0 ? (
            <div className="p-6 text-center text-xs text-zinc-500">
              No notes or commands match "{query}".
            </div>
          ) : (
            searchResults.map((item, idx) => {
              const isSelected = idx === selectedIndex
              return (
                <div
                  key={item.id}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`px-3 py-2 rounded-lg cursor-pointer flex items-center justify-between transition-colors ${
                    isSelected ? 'bg-purple-600/90 text-white' : 'text-zinc-300 hover:bg-zinc-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={isSelected ? 'text-white' : 'text-zinc-400'}>
                      {item.icon}
                    </span>
                    <div className="truncate">
                      <p className="text-xs font-medium truncate">{item.title}</p>
                      {item.subtitle && (
                        <p className={`text-[11px] truncate ${isSelected ? 'text-purple-200' : 'text-zinc-500'}`}>
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono uppercase tracking-wider shrink-0 ${
                    isSelected ? 'bg-purple-700/80 text-purple-100' : 'bg-zinc-800 text-zinc-500'
                  }`}>
                    {item.type}
                  </span>
                </div>
              )
            })
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="px-4 py-2 bg-zinc-900/60 border-t border-zinc-800 flex items-center justify-between text-[11px] text-zinc-500 select-none">
          <div className="flex items-center gap-2">
            <span>↑↓ to navigate</span>
            <span>•</span>
            <span>↵ to select</span>
            <span>•</span>
            <span>esc to dismiss</span>
          </div>
          <div className="flex items-center gap-1">
            <Command size={11} />
            <span>K</span>
          </div>
        </div>
      </div>
    </div>
  )
}
