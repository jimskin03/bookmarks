import { NoteVersion } from '@/types'
import { vaultStorage } from '@/lib/storage/vaultStorage'

export const versionService = {
  async getVersions(noteId: string): Promise<NoteVersion[]> {
    return vaultStorage.getVersions(noteId)
  }
}
