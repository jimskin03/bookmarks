import React, { useEffect } from 'react'
import { useAuth } from './hooks/useAuth'
import { useVault } from './hooks/useVault'
import { AuthGate } from './components/auth/AuthGate'
import { AppHeader } from './components/layout/AppHeader'
import { LeftSidebar } from './components/sidebar/LeftSidebar'
import { RightSidebar } from './components/sidebar/RightSidebar'
import { NoteEditor } from './components/editor/NoteEditor'
import { GraphView } from './components/graph/GraphView'
import { MindMapView } from './components/mindmap/MindMapView'
import { QuickSwitcher } from './components/search/QuickSwitcher'
import { ExportModal } from './components/export/ExportModal'

export const App: React.FC = () => {
  const {
    isAuthenticated,
    user,
    isLoading: authLoading,
    error: authError,
    isDemoMode,
    signIn,
    signOut,
    enterDemoMode,
  } = useAuth()

  const {
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
    leftSidebarOpen,
    setLeftSidebarOpen,
    rightSidebarOpen,
    setRightSidebarOpen,
    quickSwitcherOpen,
    setQuickSwitcherOpen,
    exportModalOpen,
    setExportModalOpen,
    selectNote,
    createNewNote,
    updateNote,
    deleteNote,
    createFolder,
    deleteFolder,
    refreshVault,
  } = useVault(isDemoMode, user?.id)

  // Keyboard shortcut listener
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K or Cmd+K: Quick Switcher
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setQuickSwitcherOpen(prev => !prev)
      }
      // Ctrl+P or Cmd+P: Quick Switcher
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault()
        setQuickSwitcherOpen(prev => !prev)
      }
      // Ctrl+N or Cmd+N: New Note
      else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'n') {
        e.preventDefault()
        createNewNote()
      }
      // Ctrl+Shift+G: Graph View
      else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'g') {
        e.preventDefault()
        setViewMode('graph')
      }
      // Ctrl+Shift+M: Mind Map View
      else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'm') {
        e.preventDefault()
        setViewMode('mindmap')
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [createNewNote, setQuickSwitcherOpen, setViewMode])

  // Handler for adding child note from Mind Map
  const handleAddChildFromMindMap = async (parentNoteId: string, childTitle: string) => {
    const parent = notes.find(n => n.id === parentNoteId)
    // 1. Create the new child note
    const child = await createNewNote({
      title: childTitle,
      content: `# ${childTitle}\n\nParent reference: [[${parent ? parent.title : 'Root'}]]\n\n`
    })

    // 2. Add wiki-link to the parent note
    if (parent) {
      const updatedParentContent = `${parent.content.trimEnd()}\n\n- [[${childTitle}]]\n`
      updateNote({ id: parent.id, content: updatedParentContent })
    }

    selectNote(child.id)
  }

  if (!isAuthenticated) {
    return (
      <AuthGate
        isLoading={authLoading}
        error={authError}
        onSignIn={signIn}
        onEnterDemo={enterDemoMode}
      />
    )
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-[#121214] text-zinc-100 overflow-hidden font-sans select-none">
      {/* Top Application Header */}
      <AppHeader
        vaultName={vault?.name || 'Personal Vault'}
        activeTitle={activeNote?.title}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        syncStatus={syncStatus}
        isDemoMode={isDemoMode}
        leftSidebarOpen={leftSidebarOpen}
        rightSidebarOpen={rightSidebarOpen}
        onToggleLeftSidebar={() => setLeftSidebarOpen(prev => !prev)}
        onToggleRightSidebar={() => setRightSidebarOpen(prev => !prev)}
        onOpenQuickSwitcher={() => setQuickSwitcherOpen(true)}
        onOpenExportModal={() => setExportModalOpen(true)}
        onCreateNewNote={() => createNewNote()}
        onSignOut={signOut}
      />

      {/* Cloud Migration Notice Banner */}
      {syncStatus === 'schema_missing' && (
        <div className="bg-amber-950/80 border-b border-amber-800/70 px-4 py-2 text-xs text-amber-200 flex items-center justify-between select-none">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-amber-300">Cloud Setup Required:</span>
            <span>
              The <code>bookmarks</code> schema is not yet applied or exposed in your Supabase project (PGRST106).
              Execute <code>supabase/migrations/20260928_init_bookmarks.sql</code> in your Supabase SQL Editor to enable cloud sync. Notes are currently stored in your isolated local vault.
            </span>
          </div>
        </div>
      )}

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Navigation Sidebar */}
        <LeftSidebar
          folders={folders}
          notes={notes}
          tags={tags}
          activeNoteId={activeNoteId}
          selectedTag={selectedTag}
          isOpen={leftSidebarOpen}
          onSelectNote={selectNote}
          onSelectTag={setSelectedTag}
          onCreateNote={(folderId) => createNewNote({ folderId })}
          onCreateFolder={(name, parentId) => createFolder(name, parentId)}
          onDeleteNote={deleteNote}
          onDeleteFolder={deleteFolder}
          onRefresh={refreshVault}
        />

        {/* Center Canvas View: Editor, Graph, or Mind Map */}
        <main className="flex-1 flex flex-col overflow-hidden relative">
          {viewMode === 'editor' && (
            <NoteEditor
              note={activeNote}
              allNotes={notes}
              onUpdateNote={updateNote}
              onSelectNote={selectNote}
              onCreateNoteFromLink={(title) => createNewNote({ title })}
            />
          )}

          {viewMode === 'graph' && (
            <GraphView
              activeNoteId={activeNoteId}
              onSelectNote={selectNote}
            />
          )}

          {viewMode === 'mindmap' && (
            <MindMapView
              notes={notes}
              activeNoteId={activeNoteId}
              onSelectNote={selectNote}
              onAddChildNote={handleAddChildFromMindMap}
            />
          )}
        </main>

        {/* Right Inspector Sidebar (Backlinks, Outgoing, History) */}
        {viewMode === 'editor' && (
          <RightSidebar
            activeNote={activeNote}
            isOpen={rightSidebarOpen}
            onSelectNote={selectNote}
            onCreateNoteWithTitle={(title) => createNewNote({ title })}
            onRestoreVersion={(content) => {
              if (activeNote) {
                updateNote({ id: activeNote.id, content })
              }
            }}
          />
        )}
      </div>

      {/* Quick Switcher Command Palette Modal */}
      <QuickSwitcher
        isOpen={quickSwitcherOpen}
        notes={notes}
        onClose={() => setQuickSwitcherOpen(false)}
        onSelectNote={selectNote}
        onCreateNewNote={() => createNewNote()}
        onViewModeChange={setViewMode}
        onOpenExportModal={() => setExportModalOpen(true)}
      />

      {/* Vault Export Modal */}
      <ExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        totalNotes={notes.length}
        totalFolders={folders.length}
      />
    </div>
  )
}
export default App
