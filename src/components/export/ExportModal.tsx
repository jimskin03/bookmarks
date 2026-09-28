import React, { useState } from 'react'
import { Check, Download, FileArchive, FolderTree, Info, Loader2, X } from 'lucide-react'
import { exportService } from '@/features/export/exportService'

interface ExportModalProps {
  isOpen: boolean
  onClose: () => void
  totalNotes: number
  totalFolders: number
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  totalNotes,
  totalFolders,
}) => {
  const [isExporting, setIsExporting] = useState(false)
  const [exported, setExported] = useState(false)

  if (!isOpen) return null

  const handleDownload = async () => {
    setIsExporting(true)
    try {
      await exportService.triggerDownload()
      setExported(true)
      setTimeout(() => {
        setExported(false)
        onClose()
      }, 1500)
    } catch (err) {
      console.error('Export failed:', err)
      alert('Failed to export vault. Check console for details.')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#18181c] border border-zinc-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden p-6 select-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <FileArchive size={18} className="text-purple-400" />
            <h2 className="text-sm font-semibold text-zinc-100">Export Personal Vault</h2>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300">
            <X size={16} />
          </button>
        </div>

        <div className="py-4 space-y-4">
          <p className="text-xs text-zinc-300 leading-relaxed">
            Your Bookmarks vault is completely portable. Exporting generates a standard ZIP archive compatible with Obsidian, Logseq, and standard Markdown editors.
          </p>

          <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-3 space-y-2 text-xs">
            <div className="flex items-center justify-between text-zinc-300">
              <span className="flex items-center gap-1.5 text-zinc-400">
                <FolderTree size={14} /> Total Folders:
              </span>
              <span className="font-mono font-semibold text-purple-300">{totalFolders}</span>
            </div>
            <div className="flex items-center justify-between text-zinc-300">
              <span className="flex items-center gap-1.5 text-zinc-400">
                <FileArchive size={14} /> Total Markdown Notes:
              </span>
              <span className="font-mono font-semibold text-purple-300">{totalNotes}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 pt-1 border-t border-zinc-800">
              <Info size={12} />
              <span>Includes [[wiki-links]], #tags, and manifest.json</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDownload}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-1.5 text-xs bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-lg disabled:opacity-50 transition-colors shadow-sm"
          >
            {isExporting ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>Compressing ZIP...</span>
              </>
            ) : exported ? (
              <>
                <Check size={13} className="text-emerald-300" />
                <span>Downloaded!</span>
              </>
            ) : (
              <>
                <Download size={13} />
                <span>Download Archive (.zip)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
