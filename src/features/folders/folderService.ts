import { Folder } from '@/types'
import { vaultStorage } from '@/lib/storage/vaultStorage'

export const folderService = {
  async getFolders(): Promise<Folder[]> {
    return vaultStorage.getFolders()
  },

  async createFolder(name: string, parentId: string | null = null): Promise<Folder> {
    return vaultStorage.saveFolder({
      name: name.trim(),
      parent_id: parentId,
      sort_order: 0,
      vault_id: vaultStorage.getActiveVaultId()
    })
  },

  async renameFolder(id: string, newName: string): Promise<void> {
    const folders = await vaultStorage.getFolders()
    const folder = folders.find(f => f.id === id)
    if (folder) {
      await vaultStorage.saveFolder({
        ...folder,
        name: newName.trim()
      })
    }
  },

  async deleteFolder(id: string): Promise<void> {
    return vaultStorage.deleteFolder(id)
  }
}
