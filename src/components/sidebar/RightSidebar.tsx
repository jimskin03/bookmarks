import React, { useEffect, useState } from 'react'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  ExternalLink,
  History,
  Link as LinkIcon,
  RotateCcw
} from 'lucide-react'
import { BacklinkItem, Note, NoteVersion, OutgoingLinkItem } from '@/types'
import { linkService } from '@/features/links/linkService'
import { versionService } from '@/features/versions/versionService'

interface RightSidebarProps {
  activeNote: Note | null
  isOpen: boolean
  onSelectNote: (id: string) => void
  onCreateNoteWithTitle: (title: string) => void
  onRestoreVersion: (content: string) => void
}

export const RightSidebar: React.FC<RightSidebarProps> = ({
  activeNote,
  isOpen,
  onSelectNote,
  onCreateNoteWithTitle,
  onRestoreVersion,
}) => {
  const [backlinks, setBacklinks] = useState<BacklinkItem[]>([])
  const [outgoing, setOutgoing] = useState<OutgoingLinkItem[]>([])
  const [versions, setVersions] = useState<NoteVersion[]>([])
  const [activeTab, setActiveTab] = useState<'links' | 'history'>('links')

  useEffect(() => {
    if (!activeNote) {
      setBacklinks([])
      setOutgoing([])
      setVersions([])
      return
    }

    linkService.getBacklinks(activeNote.id).then(setBacklinks)
    linkService.getOutgoingLinks(activeNote.id).then(setOutgoing)
    versionService.getVersions(activeNote.id).then(setVersions)
  }, [activeNote?.id, activeNote?.content])

  if (!isOpen || !activeNote) return null

  return (
    <aside className="w-72 border-l border-zinc-800/80 bg-[#141416] flex flex-col h-full shrink-0 select-none text-xs">
      {/* Tab bar */}
      <div className="h-10 border-b border-zinc-800/60 flex items-center px-3 justify-between bg-zinc-900/30">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('links')}
            className={`flex items-center gap-1.5 py-1 px-2 font-medium rounded transition-colors ${
              activeTab === 'links'
                ? 'bg-zinc-800 text-purple-300'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <LinkIcon size={13} />
            <span>Connections</span>
            <span className="text-[10px] bg-zinc-800 px-1 rounded-full text-zinc-400">
              {backlinks.length + outgoing.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-1.5 py-1 px-2 font-medium rounded transition-colors ${
              activeTab === 'history'
                ? 'bg-zinc-800 text-purple-300'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <History size={13} />
            <span>History</span>
            {versions.length > 0 && (
              <span className="text-[10px] bg-zinc-800 px-1 rounded-full text-zinc-400">
                {versions.length}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-5 custom-scrollbar">
        {activeTab === 'links' && (
          <>
            {/* Backlinks Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-zinc-400 font-semibold uppercase tracking-wider text-[11px]">
                <div className="flex items-center gap-1.5 text-purple-400">
                  <ArrowDownLeft size={13} />
                  <span>Backlinks ({backlinks.length})</span>
                </div>
              </div>

              {backlinks.length === 0 ? (
                <div className="text-zinc-500 py-2 italic text-[11px]">
                  No incoming backlinks yet. Reference this note with <code>[[{activeNote.title}]]</code> in other notes.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {backlinks.map((b, i) => (
                    <div
                      key={i}
                      onClick={() => onSelectNote(b.sourceNote.id)}
                      className="p-2 bg-zinc-900/60 hover:bg-zinc-800/60 border border-zinc-800/80 hover:border-purple-500/50 rounded-md cursor-pointer transition-all group"
                    >
                      <div className="flex items-center justify-between font-medium text-zinc-200 group-hover:text-purple-300">
                        <span className="truncate">{b.sourceNote.title}</span>
                        <ArrowUpRight size={12} className="opacity-0 group-hover:opacity-100 text-purple-400 transition-opacity" />
                      </div>
                      {b.snippet && (
                        <p className="mt-1 text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                          {b.snippet}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Outgoing Links Section */}
            <div className="space-y-2 pt-2 border-t border-zinc-800/60">
              <div className="flex items-center justify-between text-zinc-400 font-semibold uppercase tracking-wider text-[11px]">
                <div className="flex items-center gap-1.5 text-zinc-300">
                  <ArrowUpRight size={13} />
                  <span>Outgoing Links ({outgoing.length})</span>
                </div>
              </div>

              {outgoing.length === 0 ? (
                <div className="text-zinc-500 py-2 italic text-[11px]">
                  No outgoing links. Type <code>[[Note Name]]</code> in the editor to link to another note.
                </div>
              ) : (
                <div className="space-y-1">
                  {outgoing.map((out, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-1.5 rounded hover:bg-zinc-800/40 text-zinc-300"
                    >
                      <span className="truncate">{out.targetTitle}</span>
                      {out.exists && out.targetNote ? (
                        <button
                          onClick={() => onSelectNote(out.targetNote!.id)}
                          className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-0.5"
                          title="Open note"
                        >
                          <span>open</span>
                          <ExternalLink size={10} />
                        </button>
                      ) : (
                        <button
                          onClick={() => onCreateNoteWithTitle(out.targetTitle)}
                          className="text-[11px] text-zinc-400 hover:text-emerald-400 bg-zinc-800 px-1.5 py-0.5 rounded"
                          title="Create note now"
                        >
                          + create
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'history' && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-zinc-400 font-semibold uppercase tracking-wider text-[11px]">
              <Clock size={13} />
              <span>Snapshot Versions</span>
            </div>

            {versions.length === 0 ? (
              <div className="text-zinc-500 py-3 text-center italic text-[11px]">
                Snapshots will be saved automatically as you edit.
              </div>
            ) : (
              <div className="space-y-2">
                {versions.map((ver) => (
                  <div
                    key={ver.id}
                    className="p-2.5 bg-zinc-900/60 border border-zinc-800 rounded-md space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-zinc-300">
                        v{ver.version_number}
                      </span>
                      <button
                        onClick={() => {
                          if (confirm(`Restore to version ${ver.version_number}? Current changes will be overwritten.`)) {
                            onRestoreVersion(ver.content)
                          }
                        }}
                        className="flex items-center gap-1 px-1.5 py-0.5 bg-zinc-800 hover:bg-purple-600 text-zinc-300 hover:text-white rounded text-[10px] transition-colors"
                      >
                        <RotateCcw size={10} />
                        <span>Restore</span>
                      </button>
                    </div>
                    <div className="text-[10px] text-zinc-500">
                      {new Date(ver.created_at).toLocaleString()}
                    </div>
                    <div className="text-[11px] text-zinc-400 line-clamp-2 bg-zinc-950/40 p-1.5 rounded font-mono">
                      {ver.content.slice(0, 100) || '(empty)'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  )
}
