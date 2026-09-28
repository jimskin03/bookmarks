import JSZip from 'jszip'
import { Folder } from '@/types'
import { vaultStorage } from '@/lib/storage/vaultStorage'

export const exportService = {
  async exportVaultToZip(): Promise<Blob> {
    const zip = new JSZip()
    const vault = await vaultStorage.getVault()
    const folders = await vaultStorage.getFolders()
    const notes = await vaultStorage.getNotes(false)

    // Build folder path mapping: folderId -> "Research/AI"
    const folderMap = new Map<string, Folder>(folders.map(f => [f.id, f]))

    function getFolderPath(folderId: string | null): string {
      if (!folderId) return ''
      const parts: string[] = []
      let curr = folderMap.get(folderId)
      while (curr) {
        // Sanitize folder name for file system
        parts.unshift(curr.name.replace(/[/\\?%*:|"<>]/g, '-'))
        curr = curr.parent_id ? folderMap.get(curr.parent_id) : undefined
      }
      return parts.join('/')
    }

    // Add notes to zip in their respective folders
    for (const note of notes) {
      const folderPath = getFolderPath(note.folder_id)
      const sanitizedTitle = (note.title.trim() || 'Untitled').replace(/[/\\?%*:|"<>]/g, '-')
      const fileName = `${sanitizedTitle}.md`
      const fullPath = folderPath ? `${folderPath}/${fileName}` : fileName

      zip.file(fullPath, note.content)
    }

    // Include export manifest
    const manifest = {
      product: 'Bookmarks',
      platform: 'CryptGreg Knowledge Vault',
      exportedAt: new Date().toISOString(),
      vault: {
        id: vault.id,
        name: vault.name,
      },
      stats: {
        totalNotes: notes.length,
        totalFolders: folders.length,
      }
    }
    zip.file('manifest.json', JSON.stringify(manifest, null, 2))

    return zip.generateAsync({ type: 'blob' })
  },

  async triggerDownload(): Promise<void> {
    const blob = await this.exportVaultToZip()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const timestamp = new Date().toISOString().split('T')[0]
    a.href = url
    a.download = `Bookmarks-Vault-${timestamp}.zip`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
}
