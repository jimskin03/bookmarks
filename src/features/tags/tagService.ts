import { Tag } from '@/types'
import { vaultStorage } from '@/lib/storage/vaultStorage'

export const tagService = {
  async getTags(): Promise<Tag[]> {
    return vaultStorage.getTags()
  }
}
