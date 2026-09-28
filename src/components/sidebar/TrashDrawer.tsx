import React, { useEffect, useState } from 'react'
import { RotateCcw, XCircle } from 'lucide-react'
import { Note } from '@/types'
import { noteService } from '@/features/notes/noteService'

interface TrashDrawerProps {
  onNoteRestored: () => void
}

export const TrashDrawer: React.FC<TrashDrawerProps> = ({ onNoteRestored }) => {
  const [deletedNotes, setDeletedNotes] = useState<Note[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadTrash = async () => {
    setIsLoading(true)
    const all = await noteService.getNotes(true)
    setDeletedNotes(all.filter(n => !!n.deleted_at))
    setIsLoading(false)
  }

  useEffect(() => {
    loadTrash()
  }, [])

  const handleRestore = async (id: string) => {
    await noteService.restoreNote(id)
    await loadTrash()
    onNoteRestored()
  }

  const handlePermanentDelete = async (id: string, title: string) => {
    if (confirm(`Permanently delete "${title}"? This cannot be undone.`)) {
      await noteService.permanentlyDeleteNote(id)
      await loadTrash()
      onNoteRestored()
    }
  }

  return (
    <div className="p-2 space-y-2">
      <div className="text-xs text-zinc-400 px-1 py-1 font-semibold uppercase tracking-wider flex items-center justify-between">
        <span>Trash Bin</span>
        <span className="text-[10px] text-zinc-500">{deletedNotes.length} notes</span>
      </div>

      {isLoading ? (
        <div className="text-xs text-zinc-500 py-3 text-center">Loading trash...</div>
      ) : deletedNotes.length === 0 ? (
        <div className="text-xs text-zinc-500 py-4 text-center">
          Trash is empty.
        </div>
      ) : (
        <div className="space-y-1">
          {deletedNotes.map(note => (
            <div
              key={note.id}
              className="p-2 bg-zinc-900/60 border border-zinc-800 rounded flex items-center justify-between text-xs"
            >
              <div className="truncate mr-2">
                <p className="text-zinc-300 font-medium truncate">{note.title || 'Untitled'}</p>
                <p className="text-[10px] text-zinc-500">
                  Deleted: {new Date(note.deleted_at!).toLocaleDateString()}
                </p>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleRestore(note.id)}
                  title="Restore note"
                  className="p-1 text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 rounded transition-colors"
                >
                  <RotateCcw size={13} />
                </button>
                <button
                  onClick={() => handlePermanentDelete(note.id, note.title)}
                  title="Permanently delete"
                  className="p-1 text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 rounded transition-colors"
                >
                  <XCircle size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
