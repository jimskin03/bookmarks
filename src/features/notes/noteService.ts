import { Note } from '@/types'
import { vaultStorage } from '@/lib/storage/vaultStorage'

export const noteService = {
  async getNotes(includeDeleted = false): Promise<Note[]> {
    return vaultStorage.getNotes(includeDeleted)
  },

  async getNote(id: string): Promise<Note | null> {
    return vaultStorage.getNote(id)
  },

  async createNote(params: { title?: string; folderId?: string | null; content?: string }): Promise<Note> {
    return vaultStorage.saveNote({
      title: params.title || 'Untitled',
      folder_id: params.folderId || null,
      content: params.content || '',
    })
  },

  async updateNote(note: Partial<Note> & { id: string; title: string; content: string }): Promise<Note> {
    return vaultStorage.saveNote(note)
  },

  async softDeleteNote(id: string): Promise<void> {
    return vaultStorage.softDeleteNote(id)
  },

  async restoreNote(id: string): Promise<void> {
    return vaultStorage.restoreNote(id)
  },

  async permanentlyDeleteNote(id: string): Promise<void> {
    return vaultStorage.permanentlyDeleteNote(id)
  }
}
