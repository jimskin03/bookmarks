import { useCallback, useEffect, useRef, useState } from 'react'
import { Folder, Note, SyncStatus, Tag, Vault, ViewMode } from '@/types'
import { noteService } from '@/features/notes/noteService'
import { folderService } from '@/features/folders/folderService'
import { tagService } from '@/features/tags/tagService'
import { vaultStorage } from '@/lib/storage/vaultStorage'

export function useVault(isDemoMode: boolean) {
  const [vault, setVault] = useState<Vault | null>(null)
  const [folders, setFolders] = useState<Folder[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null)
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('editor')
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(isDemoMode ? 'local_demo' : 'saved')
  const [isLoading, setIsLoading] = useState(true)

  // Sidebars & Modals
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true)
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true)
  const [quickSwitcherOpen, setQuickSwitcherOpen] = useState(false)
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [mindMapRootId, setMindMapRootId] = useState<string | null>(null)

  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Refresh all vault data
  const refreshVault = useCallback(async () => {
    try {
      const v = await vaultStorage.getVault()
      setVault(v)

      const f = await folderService.getFolders()
      setFolders(f)

      const n = await noteService.getNotes(false)
      setNotes(n)

      const t = await tagService.getTags()
      setTags(t)

      // Set initial active note if none selected
      if (!activeNoteId && n.length > 0) {
        setActiveNoteId(n[0].id)
        setMindMapRootId(n[0].id)
      }
    } catch (err) {
      console.error('Failed to load vault data:', err)
      setSyncStatus('error')
    } finally {
      setIsLoading(false)
    }
  }, [activeNoteId])

  useEffect(() => {
    refreshVault()
  }, [refreshVault])

  const activeNote = notes.find(n => n.id === activeNoteId) || null

  // Open note
  const selectNote = useCallback((id: string) => {
    setActiveNoteId(id)
    setViewMode('editor')
    setMindMapRootId(id)
  }, [])

  // Create new note
  const createNewNote = useCallback(async (params?: { title?: string; folderId?: string | null; content?: string }) => {
    setSyncStatus('saving')
    try {
      const newNote = await noteService.createNote({
        title: params?.title || 'Untitled Note',
        folderId: params?.folderId ?? null,
        content: params?.content || '# ' + (params?.title || 'Untitled Note') + '\n\n',
      })
      await refreshVault()
      setActiveNoteId(newNote.id)
      setViewMode('editor')
      setSyncStatus(isDemoMode ? 'local_demo' : 'saved')
      return newNote
    } catch (err) {
      console.error('Create note failed:', err)
      setSyncStatus('error')
      throw err
    }
  }, [isDemoMode, refreshVault])

  // Update note with debounced autosave
  const updateNote = useCallback((updatedFields: Partial<Note> & { id: string }) => {
    // 1. Optimistic local state update
    setNotes(prev => prev.map(n => n.id === updatedFields.id ? { ...n, ...updatedFields, updated_at: new Date().toISOString() } : n))
    setSyncStatus('saving')

    // 2. Debounce persistence
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current)
    }

    autosaveTimerRef.current = setTimeout(async () => {
      try {
        const fullNote = notes.find(n => n.id === updatedFields.id)
        if (fullNote) {
          const merged = { ...fullNote, ...updatedFields }
          await noteService.updateNote(merged)
          const updatedTags = await tagService.getTags()
          setTags(updatedTags)
          setSyncStatus(isDemoMode ? 'local_demo' : 'saved')
        }
      } catch (err) {
        console.error('Autosave error:', err)
        setSyncStatus('error')
      }
    }, 600)
  }, [isDemoMode, notes])

  // Soft delete note
  const deleteNote = useCallback(async (id: string) => {
    try {
      await noteService.softDeleteNote(id)
      const remainingNotes = notes.filter(n => n.id !== id)
      setNotes(remainingNotes)
      if (activeNoteId === id) {
        setActiveNoteId(remainingNotes.length > 0 ? remainingNotes[0].id : null)
      }
      const updatedTags = await tagService.getTags()
      setTags(updatedTags)
    } catch (err) {
      console.error('Delete note failed:', err)
    }
  }, [activeNoteId, notes])

  // Create folder
  const createFolder = useCallback(async (name: string, parentId: string | null = null) => {
    try {
      await folderService.createFolder(name, parentId)
      const updatedFolders = await folderService.getFolders()
      setFolders(updatedFolders)
    } catch (err) {
      console.error('Create folder failed:', err)
    }
  }, [])

  // Delete folder
  const deleteFolder = useCallback(async (id: string) => {
    try {
      await folderService.deleteFolder(id)
      const updatedFolders = await folderService.getFolders()
      setFolders(updatedFolders)
      // Update notes that belonged to this folder
      setNotes(prev => prev.map(n => n.folder_id === id ? { ...n, folder_id: null } : n))
    } catch (err) {
      console.error('Delete folder failed:', err)
    }
  }, [])

  return {
    vault,
    folders,
    notes,
    tags,
    activeNote,
    activeNoteId,
    selectedTag,
    setSelectedTag,
    viewMode,
    setViewMode,
    syncStatus,
    isLoading,
    leftSidebarOpen,
    setLeftSidebarOpen,
    rightSidebarOpen,
    setRightSidebarOpen,
    quickSwitcherOpen,
    setQuickSwitcherOpen,
    exportModalOpen,
    setExportModalOpen,
    mindMapRootId,
    setMindMapRootId,
    selectNote,
    createNewNote,
    updateNote,
    deleteNote,
    createFolder,
    deleteFolder,
    refreshVault,
  }
}
