import React from 'react'
import {
  BookOpen,
  CheckCircle2,
  Cloud,
  Download,
  GitFork,
  HardDrive,
  LogOut,
  Network,
  Plus,
  RefreshCw,
  Search,
  SidebarClose,
  SidebarOpen
} from 'lucide-react'
import { SyncStatus, ViewMode } from '@/types'

interface AppHeaderProps {
  vaultName: string
  activeTitle?: string
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  syncStatus: SyncStatus
  isDemoMode: boolean
  leftSidebarOpen: boolean
  rightSidebarOpen: boolean
  onToggleLeftSidebar: () => void
  onToggleRightSidebar: () => void
  onOpenQuickSwitcher: () => void
  onOpenExportModal: () => void
  onCreateNewNote: () => void
  onSignOut: () => void
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  vaultName,
  activeTitle,
  viewMode,
  onViewModeChange,
  syncStatus,
  isDemoMode,
  leftSidebarOpen,
  rightSidebarOpen,
  onToggleLeftSidebar,
  onToggleRightSidebar,
  onOpenQuickSwitcher,
  onOpenExportModal,
  onCreateNewNote,
  onSignOut,
}) => {
  return (
    <header className="h-12 border-b border-zinc-800 bg-[#16161a] px-3 flex items-center justify-between select-none z-20">
      {/* Left section: sidebars toggle & breadcrumb */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleLeftSidebar}
          title={leftSidebarOpen ? 'Hide left sidebar' : 'Show left sidebar'}
          className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors"
        >
          {leftSidebarOpen ? <SidebarClose size={18} /> : <SidebarOpen size={18} />}
        </button>

        <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-medium">
          <span className="flex items-center gap-1 text-purple-400 font-semibold">
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
            {vaultName}
          </span>
          {activeTitle && (
            <>
              <span className="text-zinc-600">/</span>
              <span className="text-zinc-200 max-w-[200px] truncate">{activeTitle}</span>
            </>
          )}
        </div>
      </div>

      {/* Middle section: View mode toggles */}
      <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
        <button
          onClick={() => onViewModeChange('editor')}
          className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
            viewMode === 'editor'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
          title="Note Editor"
        >
          <BookOpen size={14} />
          <span>Editor</span>
        </button>
        <button
          onClick={() => onViewModeChange('graph')}
          className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
            viewMode === 'graph'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
          title="Interactive Knowledge Graph"
        >
          <Network size={14} />
          <span>Graph</span>
        </button>
        <button
          onClick={() => onViewModeChange('mindmap')}
          className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
            viewMode === 'mindmap'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
          title="Mind Map Explorer"
        >
          <GitFork size={14} />
          <span>Mind Map</span>
        </button>
      </div>

      {/* Right section: Search, Actions, Sync badge & User */}
      <div className="flex items-center gap-2">
        {/* Quick Switcher / Search Trigger */}
        <button
          onClick={onOpenQuickSwitcher}
          className="flex items-center gap-2 px-2.5 py-1 text-xs bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-md transition-colors"
          title="Quick Switcher (Ctrl+K or Ctrl+P)"
        >
          <Search size={13} />
          <span className="hidden sm:inline">Search...</span>
          <kbd className="hidden sm:inline bg-zinc-800 px-1.5 py-0.5 rounded text-[10px] text-zinc-400 font-mono">⌘K</kbd>
        </button>

        {/* New Note Button */}
        <button
          onClick={onCreateNewNote}
          className="flex items-center gap-1 px-2.5 py-1 text-xs bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-md transition-colors shadow-sm"
          title="Create New Note (Ctrl+N)"
        >
          <Plus size={14} />
          <span className="hidden sm:inline">New Note</span>
        </button>

        {/* Sync Status Badge */}
        <div className="hidden md:flex items-center gap-1.5 px-2 py-1 text-[11px] text-zinc-400 border border-zinc-800/80 rounded-md bg-zinc-900/60">
          {syncStatus === 'saving' ? (
            <>
              <RefreshCw size={12} className="animate-spin text-amber-400" />
              <span className="text-amber-300">Saving...</span>
            </>
          ) : syncStatus === 'local_demo' ? (
            <>
              <HardDrive size={12} className="text-emerald-400" />
              <span className="text-emerald-300">Demo Vault</span>
            </>
          ) : syncStatus === 'error' ? (
            <>
              <Cloud size={12} className="text-rose-400" />
              <span className="text-rose-300">Offline</span>
            </>
          ) : (
            <>
              <CheckCircle2 size={12} className="text-emerald-400" />
              <span className="text-zinc-400">Saved</span>
            </>
          )}
        </div>

        {/* Export Button */}
        <button
          onClick={onOpenExportModal}
          className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors"
          title="Export Vault to Markdown ZIP"
        >
          <Download size={16} />
        </button>

        {/* Right sidebar toggle */}
        <button
          onClick={onToggleRightSidebar}
          title={rightSidebarOpen ? 'Hide inspector' : 'Show inspector'}
          className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors"
        >
          {rightSidebarOpen ? <SidebarClose size={18} className="rotate-180" /> : <SidebarOpen size={18} className="rotate-180" />}
        </button>

        {/* Account / Exit */}
        <button
          onClick={onSignOut}
          title={isDemoMode ? 'Exit Demo' : 'Sign Out'}
          className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 rounded transition-colors"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  )
}
