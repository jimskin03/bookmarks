import React, { useState } from 'react'
import {
  FilePlus,
  FolderPlus,
  Hash,
  Library,
  Trash2,
  X
} from 'lucide-react'
import { Folder, Note, Tag } from '@/types'
import { FolderTree } from './FolderTree'
import { TagsList } from './TagsList'
import { TrashDrawer } from './TrashDrawer'

interface LeftSidebarProps {
  folders: Folder[]
  notes: Note[]
  tags: Tag[]
  activeNoteId: string | null
  selectedTag: string | null
  isOpen: boolean
  onSelectNote: (id: string) => void
  onSelectTag: (tag: string | null) => void
  onCreateNote: (folderId?: string | null) => void
  onCreateFolder: (name: string, parentId?: string | null) => void
  onDeleteNote: (id: string) => void
  onDeleteFolder: (id: string) => void
  onRefresh: () => void
}

type SidebarTab = 'notes' | 'tags' | 'trash'

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  folders,
  notes,
  tags,
  activeNoteId,
  selectedTag,
  isOpen,
  onSelectNote,
  onSelectTag,
  onCreateNote,
  onCreateFolder,
  onDeleteNote,
  onDeleteFolder,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<SidebarTab>('notes')
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')

  if (!isOpen) return null

  const handleCreateFolderSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim())
      setNewFolderName('')
      setIsCreatingFolder(false)
    }
  }

  // Filter notes by tag if a tag is selected
  const displayedNotes = selectedTag
    ? notes.filter(n => (n.metadata?.tags || []).includes(selectedTag))
    : notes

  return (
    <aside className="w-64 border-r border-zinc-800/80 bg-[#141416] flex flex-col h-full shrink-0 select-none">
      {/* Top action toolbar */}
      <div className="p-2 border-b border-zinc-800/60 flex items-center justify-between gap-1">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onCreateNote(null)}
            className="flex items-center gap-1.5 px-2 py-1 text-xs text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-purple-600 rounded transition-colors"
            title="Create note in root"
          >
            <FilePlus size={13} />
            <span>Note</span>
          </button>
          <button
            onClick={() => setIsCreatingFolder(true)}
            className="flex items-center gap-1.5 px-2 py-1 text-xs text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-700 rounded transition-colors"
            title="New folder"
          >
            <FolderPlus size={13} />
            <span>Folder</span>
          </button>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center bg-zinc-900/80 p-0.5 rounded border border-zinc-800/60">
          <button
            onClick={() => setActiveTab('notes')}
            className={`p-1 rounded text-xs transition-colors ${
              activeTab === 'notes' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title="Vault Files"
          >
            <Library size={13} />
          </button>
          <button
            onClick={() => setActiveTab('tags')}
            className={`p-1 rounded text-xs transition-colors ${
              activeTab === 'tags' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title="Tags Explorer"
          >
            <Hash size={13} />
          </button>
          <button
            onClick={() => setActiveTab('trash')}
            className={`p-1 rounded text-xs transition-colors ${
              activeTab === 'trash' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title="Trash Bin"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* New Folder Inline Form */}
      {isCreatingFolder && (
        <form onSubmit={handleCreateFolderSubmit} className="p-2 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-1">
            <input
              type="text"
              autoFocus
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name..."
              className="flex-1 bg-zinc-800 text-zinc-200 text-xs px-2 py-1 rounded border border-zinc-700 outline-none focus:border-purple-500"
            />
            <button
              type="submit"
              className="px-2 py-1 bg-purple-600 hover:bg-purple-500 text-white text-xs rounded"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setIsCreatingFolder(false)}
              className="p-1 text-zinc-400 hover:text-zinc-200"
            >
              <X size={14} />
            </button>
          </div>
        </form>
      )}

      {/* Tag filter notification if active */}
      {selectedTag && activeTab === 'notes' && (
        <div className="px-3 py-1.5 bg-purple-950/40 border-b border-purple-900/40 flex items-center justify-between text-xs text-purple-300">
          <span className="flex items-center gap-1">
            <Hash size={12} />
            Filtered by #{selectedTag}
          </span>
          <button onClick={() => onSelectTag(null)} className="hover:text-white">
            <X size={12} />
          </button>
        </div>
      )}

      {/* Scrollable list based on active tab */}
      <div className="flex-1 overflow-y-auto px-1 py-1 custom-scrollbar">
        {activeTab === 'notes' && (
          <FolderTree
            folders={folders}
            notes={displayedNotes}
            activeNoteId={activeNoteId}
            onSelectNote={onSelectNote}
            onCreateNoteInFolder={onCreateNote}
            onDeleteNote={onDeleteNote}
            onDeleteFolder={onDeleteFolder}
          />
        )}

        {activeTab === 'tags' && (
          <TagsList
            tags={tags}
            selectedTag={selectedTag}
            onSelectTag={(t) => {
              onSelectTag(t)
              if (t) setActiveTab('notes')
            }}
          />
        )}

        {activeTab === 'trash' && (
          <TrashDrawer onNoteRestored={onRefresh} />
        )}
      </div>
    </aside>
  )
}
