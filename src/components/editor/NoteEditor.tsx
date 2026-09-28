import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Columns,
  Eye,
  FileEdit,
  Hash,
  Sparkles
} from 'lucide-react'
import { Note } from '@/types'

interface NoteEditorProps {
  note: Note | null
  allNotes: Note[]
  onUpdateNote: (updated: Partial<Note> & { id: string }) => void
  onSelectNote: (id: string) => void
  onCreateNoteFromLink: (title: string) => void
}

type EditorMode = 'edit' | 'split' | 'preview'

export const NoteEditor: React.FC<NoteEditorProps> = ({
  note,
  allNotes,
  onUpdateNote,
  onSelectNote,
  onCreateNoteFromLink,
}) => {
  const [editorMode, setEditorMode] = useState<EditorMode>('split')
  const [title, setTitle] = useState(note?.title || '')
  const [content, setContent] = useState(note?.content || '')

  // [[ Wiki-link autocomplete state
  const [showAutocomplete, setShowAutocomplete] = useState(false)
  const [autocompleteQuery, setAutocompleteQuery] = useState('')
  const [autocompleteIndex, setAutocompleteIndex] = useState(0)
  const [cursorPosition, setCursorPosition] = useState(0)

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Keep local buffer in sync when active note changes
  useEffect(() => {
    if (note) {
      setTitle(note.title)
      setContent(note.content)
      setShowAutocomplete(false)
    }
  }, [note?.id])

  if (!note) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 select-none bg-[#121214]">
        <Sparkles size={40} className="text-zinc-700 mb-3" />
        <p className="text-sm font-medium">Select a note or create a new one to begin writing.</p>
        <p className="text-xs text-zinc-600 mt-1">Press ⌘K or Ctrl+K for quick actions.</p>
      </div>
    )
  }

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle)
    onUpdateNote({ id: note.id, title: newTitle })
  }

  const handleContentChange = (newContent: string) => {
    setContent(newContent)
    onUpdateNote({ id: note.id, content: newContent })

    // Detect [[ trigger for autocomplete
    const textarea = textareaRef.current
    if (textarea) {
      const pos = textarea.selectionStart
      setCursorPosition(pos)
      const textBefore = newContent.slice(0, pos)
      const linkOpenIdx = textBefore.lastIndexOf('[[')

      if (linkOpenIdx !== -1 && !textBefore.slice(linkOpenIdx).includes(']]') && !textBefore.slice(linkOpenIdx).includes('\n')) {
        const query = textBefore.slice(linkOpenIdx + 2)
        setAutocompleteQuery(query)
        setShowAutocomplete(true)
        setAutocompleteIndex(0)
        return
      }
    }
    setShowAutocomplete(false)
  }

  // Filter notes for autocomplete
  const autocompleteSuggestions = useMemo(() => {
    if (!showAutocomplete) return []
    const q = autocompleteQuery.toLowerCase().trim()
    return allNotes
      .filter(n => n.id !== note.id && !n.deleted_at && (q === '' || n.title.toLowerCase().includes(q)))
      .slice(0, 7)
  }, [showAutocomplete, autocompleteQuery, allNotes, note.id])

  // Insert selected note into textarea
  const insertWikiLink = (targetTitle: string) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const pos = cursorPosition
    const textBefore = content.slice(0, pos)
    const textAfter = content.slice(pos)
    const linkOpenIdx = textBefore.lastIndexOf('[[')

    if (linkOpenIdx !== -1) {
      const prefix = textBefore.slice(0, linkOpenIdx)
      const insertion = `[[${targetTitle}]]`
      const newContent = prefix + insertion + textAfter
      setContent(newContent)
      onUpdateNote({ id: note.id, content: newContent })
      setShowAutocomplete(false)

      // Move cursor after link
      setTimeout(() => {
        if (textareaRef.current) {
          const newPos = prefix.length + insertion.length
          textareaRef.current.focus()
          textareaRef.current.setSelectionRange(newPos, newPos)
        }
      }, 10)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showAutocomplete) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setAutocompleteIndex(prev => (prev + 1) % (autocompleteSuggestions.length + 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setAutocompleteIndex(prev => (prev - 1 + autocompleteSuggestions.length + 1) % (autocompleteSuggestions.length + 1))
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        if (autocompleteIndex < autocompleteSuggestions.length) {
          insertWikiLink(autocompleteSuggestions[autocompleteIndex].title)
        } else if (autocompleteQuery.trim()) {
          // Create new note option
          onCreateNoteFromLink(autocompleteQuery.trim())
          insertWikiLink(autocompleteQuery.trim())
        }
      } else if (e.key === 'Escape') {
        setShowAutocomplete(false)
      }
    }
  }

  // Parse markdown content with interactive [[wiki-links]]
  const renderInteractiveMarkdown = (text: string) => {
    const lines = text.split('\n')
    const titleToNoteMap = new Map(allNotes.map(n => [n.title.toLowerCase().trim(), n]))

    return lines.map((line, lineIdx) => {
      // Process [[Link]] in line
      const parts: React.ReactNode[] = []
      let lastIndex = 0
      const linkRegex = /\[\[([^[\]|]+?)(?:\|([^[\]]+?))?\]\]/g
      let match: RegExpExecArray | null

      while ((match = linkRegex.exec(line)) !== null) {
        const matchStart = match.index
        const matchEnd = matchStart + match[0].length

        if (matchStart > lastIndex) {
          parts.push(renderLineFormatting(line.slice(lastIndex, matchStart), `p-${lineIdx}-${lastIndex}`))
        }

        const targetTitle = match[1].trim()
        const displayLabel = match[2]?.trim() || targetTitle
        const targetNote = titleToNoteMap.get(targetTitle.toLowerCase())

        parts.push(
          <span
            key={`link-${lineIdx}-${matchStart}`}
            onClick={(e) => {
              e.stopPropagation()
              if (targetNote) {
                onSelectNote(targetNote.id)
              } else {
                onCreateNoteFromLink(targetTitle)
              }
            }}
            title={targetNote ? `Go to note: ${targetTitle}` : `Create note: ${targetTitle}`}
            className={`inline-flex items-center px-1.5 py-0.5 rounded cursor-pointer font-medium text-xs mx-0.5 transition-colors ${
              targetNote
                ? 'bg-purple-900/40 text-purple-300 hover:bg-purple-800/60 hover:text-purple-100 underline decoration-purple-500/50 underline-offset-2'
                : 'bg-zinc-800/80 text-zinc-400 hover:text-purple-300 hover:bg-zinc-700/80 border border-dashed border-zinc-600'
            }`}
          >
            {displayLabel}
          </span>
        )

        lastIndex = matchEnd
      }

      if (lastIndex < line.length) {
        parts.push(renderLineFormatting(line.slice(lastIndex), `p-${lineIdx}-${lastIndex}`))
      }

      // Render line as heading or normal paragraph
      if (line.startsWith('# ')) {
        return <h1 key={lineIdx} className="text-2xl font-bold text-zinc-100 mt-5 mb-2 pb-1 border-b border-zinc-800/80">{parts.length > 0 ? parts : line.slice(2)}</h1>
      }
      if (line.startsWith('## ')) {
        return <h2 key={lineIdx} className="text-xl font-semibold text-zinc-100 mt-4 mb-2">{parts.length > 0 ? parts : line.slice(3)}</h2>
      }
      if (line.startsWith('### ')) {
        return <h3 key={lineIdx} className="text-base font-semibold text-zinc-200 mt-3 mb-1.5">{parts.length > 0 ? parts : line.slice(4)}</h3>
      }
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return (
          <li key={lineIdx} className="ml-5 list-disc text-zinc-300 my-0.5 leading-relaxed">
            {parts.length > 0 ? parts : line.slice(2)}
          </li>
        )
      }
      if (line.startsWith('> ')) {
        return (
          <blockquote key={lineIdx} className="border-l-2 border-purple-500 pl-3 my-2 text-zinc-400 italic bg-purple-950/20 py-1 rounded-r">
            {parts.length > 0 ? parts : line.slice(2)}
          </blockquote>
        )
      }
      if (line.trim() === '') {
        return <div key={lineIdx} className="h-3" />
      }

      return (
        <p key={lineIdx} className="text-zinc-300 my-1 leading-relaxed">
          {parts.length > 0 ? parts : line}
        </p>
      )
    })
  }

  // Helper for inline bold, italic, code, tags
  const renderLineFormatting = (text: string, keyPrefix: string): React.ReactNode => {
    // Highlight tags
    const tagRegex = /(?:^|\s)(#[a-zA-Z0-9_\-\/]+)/g
    const chunks = text.split(tagRegex)
    return (
      <span key={keyPrefix}>
        {chunks.map((chunk, i) => {
          if (chunk.startsWith('#') && chunk.length > 1) {
            return (
              <span key={`${keyPrefix}-tag-${i}`} className="inline-block text-purple-400 font-mono text-xs font-medium px-1 py-0.5 bg-purple-950/40 rounded mr-0.5">
                {chunk}
              </span>
            )
          }
          return chunk
        })}
      </span>
    )
  }

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0
  const charCount = content.length
  const tags = note.metadata?.tags || []

  return (
    <div className="flex-1 flex flex-col h-full bg-[#121214] relative overflow-hidden">
      {/* Editor top toolbar */}
      <div className="h-10 px-4 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/20 select-none">
        {/* Tags badges */}
        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
          {tags.map(t => (
            <span key={t} className="flex items-center gap-0.5 text-[11px] px-2 py-0.5 bg-purple-950/50 text-purple-300 border border-purple-800/40 rounded-full font-mono">
              <Hash size={10} />
              {t}
            </span>
          ))}
          {tags.length === 0 && (
            <span className="text-[11px] text-zinc-500 italic">No tags</span>
          )}
        </div>

        {/* View mode toggle: Edit, Split, Preview */}
        <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded p-0.5">
          <button
            onClick={() => setEditorMode('edit')}
            className={`p-1 rounded text-xs transition-colors ${
              editorMode === 'edit' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title="Edit mode"
          >
            <FileEdit size={13} />
          </button>
          <button
            onClick={() => setEditorMode('split')}
            className={`p-1 rounded text-xs transition-colors ${
              editorMode === 'split' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title="Split mode (Edit & Live Preview)"
          >
            <Columns size={13} />
          </button>
          <button
            onClick={() => setEditorMode('preview')}
            className={`p-1 rounded text-xs transition-colors ${
              editorMode === 'preview' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title="Preview mode"
          >
            <Eye size={13} />
          </button>
        </div>
      </div>

      {/* Note Title Input */}
      <div className="px-8 pt-4 pb-2 border-b border-zinc-800/40 bg-zinc-900/10">
        <input
          type="text"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Note title..."
          className="w-full bg-transparent text-2xl font-bold text-zinc-100 placeholder-zinc-600 outline-none border-none tracking-tight"
        />
        <div className="text-[11px] text-zinc-500 mt-1 flex items-center gap-3 font-mono">
          <span>{wordCount} words</span>
          <span>•</span>
          <span>{charCount} characters</span>
          <span>•</span>
          <span>Last updated {new Date(note.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Editor Pane */}
        {(editorMode === 'edit' || editorMode === 'split') && (
          <div className={`h-full flex flex-col ${editorMode === 'split' ? 'w-1/2 border-r border-zinc-800/80' : 'w-full'} relative`}>
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Write your thoughts in Markdown... Use [[Note Title]] to link notes, #tag for categories."
              className="w-full h-full p-8 bg-transparent text-zinc-200 placeholder-zinc-600 font-mono text-sm leading-relaxed resize-none outline-none overflow-y-auto custom-scrollbar"
            />

            {/* [[ Autocomplete Popup */}
            {showAutocomplete && (
              <div
                className="absolute left-8 bottom-12 w-72 bg-[#1a1a1e] border border-zinc-700/80 rounded-lg shadow-2xl overflow-hidden z-30 select-none animate-in fade-in slide-in-from-bottom-2 duration-150"
              >
                <div className="px-3 py-1.5 border-b border-zinc-800 bg-zinc-900/80 text-[11px] font-semibold text-zinc-400 flex items-center justify-between">
                  <span>Link to Note</span>
                  <span className="text-[10px] text-zinc-500">↑↓ to navigate, ↵ to pick</span>
                </div>

                <div className="max-h-52 overflow-y-auto p-1 space-y-0.5 custom-scrollbar">
                  {autocompleteSuggestions.map((item, idx) => {
                    const isSelected = idx === autocompleteIndex
                    return (
                      <div
                        key={item.id}
                        onMouseDown={(e) => {
                          e.preventDefault()
                          insertWikiLink(item.title)
                        }}
                        className={`px-2.5 py-1.5 rounded text-xs cursor-pointer flex items-center justify-between transition-colors ${
                          isSelected ? 'bg-purple-600 text-white font-medium' : 'text-zinc-300 hover:bg-zinc-800'
                        }`}
                      >
                        <span className="truncate">{item.title}</span>
                        {item.metadata?.tags && item.metadata.tags.length > 0 && (
                          <span className={`text-[10px] ${isSelected ? 'text-purple-200' : 'text-zinc-500'}`}>
                            #{item.metadata.tags[0]}
                          </span>
                        )}
                      </div>
                    )
                  })}

                  {/* Create New Note Option */}
                  {autocompleteQuery.trim() && (
                    <div
                      onMouseDown={(e) => {
                        e.preventDefault()
                        onCreateNoteFromLink(autocompleteQuery.trim())
                        insertWikiLink(autocompleteQuery.trim())
                      }}
                      className={`px-2.5 py-1.5 rounded text-xs cursor-pointer flex items-center gap-1.5 transition-colors border-t border-zinc-800 mt-1 ${
                        autocompleteIndex === autocompleteSuggestions.length
                          ? 'bg-purple-600 text-white font-medium'
                          : 'text-purple-300 hover:bg-zinc-800'
                      }`}
                    >
                      <span className="text-zinc-400 font-bold">+</span>
                      <span>Create note <strong>"[[{autocompleteQuery.trim()}]]"</strong></span>
                    </div>
                  )}

                  {autocompleteSuggestions.length === 0 && !autocompleteQuery.trim() && (
                    <div className="p-3 text-center text-xs text-zinc-500">
                      Type note title to link...
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Preview Pane */}
        {(editorMode === 'preview' || editorMode === 'split') && (
          <div className={`h-full overflow-y-auto p-8 custom-scrollbar ${editorMode === 'split' ? 'w-1/2' : 'w-full'}`}>
            <div className="max-w-3xl prose prose-invert prose-purple">
              {renderInteractiveMarkdown(content)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
