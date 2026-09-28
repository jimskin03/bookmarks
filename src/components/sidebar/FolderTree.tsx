import React, { useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Folder as FolderIcon,
  FolderOpen,
  Plus,
  Trash2
} from 'lucide-react'
import { Folder, Note } from '@/types'

interface FolderTreeProps {
  folders: Folder[]
  notes: Note[]
  activeNoteId: string | null
  onSelectNote: (id: string) => void
  onCreateNoteInFolder: (folderId: string | null) => void
  onDeleteNote: (id: string) => void
  onDeleteFolder: (id: string) => void
}

export const FolderTree: React.FC<FolderTreeProps> = ({
  folders,
  notes,
  activeNoteId,
  onSelectNote,
  onCreateNoteInFolder,
  onDeleteNote,
  onDeleteFolder,
}) => {
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({})

  const toggleFolder = (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setCollapsedFolders(prev => ({ ...prev, [folderId]: !prev[folderId] }))
  }

  // Get notes belonging directly to folderId
  const getNotesInFolder = (folderId: string | null) => {
    return notes.filter(n => n.folder_id === folderId)
  }

  // Recursive folder node
  const renderFolder = (folder: Folder, level = 0) => {
    const isCollapsed = !!collapsedFolders[folder.id]
    const childFolders = folders.filter(f => f.parent_id === folder.id)
    const folderNotes = getNotesInFolder(folder.id)

    return (
      <div key={folder.id} className="select-none">
        <div
          className="group flex items-center justify-between px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800/60 rounded cursor-pointer transition-colors"
          style={{ paddingLeft: `${Math.max(8, level * 14 + 8)}px` }}
          onClick={(e) => toggleFolder(folder.id, e)}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-zinc-500 hover:text-zinc-300">
              {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
            </span>
            <span className="text-purple-400">
              {isCollapsed ? <FolderIcon size={14} /> : <FolderOpen size={14} />}
            </span>
            <span className="truncate font-medium text-zinc-200">{folder.name}</span>
          </div>

          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onCreateNoteInFolder(folder.id)
              }}
              title="New note in folder"
              className="p-1 hover:text-purple-400 rounded"
            >
              <Plus size={12} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (confirm(`Delete folder "${folder.name}"? Notes inside will be moved to root.`)) {
                  onDeleteFolder(folder.id)
                }
              }}
              title="Delete folder"
              className="p-1 hover:text-rose-400 rounded"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        {/* Children if expanded */}
        {!isCollapsed && (
          <div>
            {childFolders.map(child => renderFolder(child, level + 1))}
            {folderNotes.map(note => renderNoteItem(note, level + 1))}
          </div>
        )}
      </div>
    )
  }

  const renderNoteItem = (note: Note, level = 0) => {
    const isActive = activeNoteId === note.id

    return (
      <div
        key={note.id}
        onClick={() => onSelectNote(note.id)}
        className={`group flex items-center justify-between py-1 px-2 rounded cursor-pointer text-xs transition-colors ${
          isActive
            ? 'bg-purple-950/60 text-purple-200 border-l-2 border-purple-500 font-medium'
            : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
        }`}
        style={{ paddingLeft: `${Math.max(12, level * 14 + 14)}px` }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <FileText size={13} className={isActive ? 'text-purple-400' : 'text-zinc-500'} />
          <span className="truncate">{note.title || 'Untitled'}</span>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation()
            onDeleteNote(note.id)
          }}
          title="Move to trash"
          className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-rose-400 rounded transition-opacity"
        >
          <Trash2 size={12} />
        </button>
      </div>
    )
  }

  // Root level folders and root notes
  const rootFolders = folders.filter(f => !f.parent_id)
  const rootNotes = getNotesInFolder(null)

  return (
    <div className="space-y-0.5 py-1">
      {rootFolders.map(folder => renderFolder(folder, 0))}
      {rootNotes.map(note => renderNoteItem(note, 0))}

      {folders.length === 0 && notes.length === 0 && (
        <div className="p-4 text-center text-xs text-zinc-500">
          No notes yet. Click "+ New Note" above to begin.
        </div>
      )}
    </div>
  )
}
