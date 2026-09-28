import { Folder, Note, NoteLink, NoteVersion, Tag, Vault } from '@/types'
import { extractTags, extractWikiLinks, generateSlug } from '../markdown/linkParser'
import { bookmarksDb, supabase } from '../supabase/client'

const STORAGE_KEY_PREFIX = 'cryptgreg_bookmarks_'

// Safe storage with in-memory fallback for Node/Vitest environments
const inMemoryStore = new Map<string, string>()

const safeStorage = {
  getItem(key: string): string | null {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key)
    }
    return inMemoryStore.get(key) || null
  },
  setItem(key: string, value: string): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value)
    } else {
      inMemoryStore.set(key, value)
    }
  },
  removeItem(key: string): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key)
    } else {
      inMemoryStore.delete(key)
    }
  }
}

// High-quality initial seed data showcasing the full power of Bookmarks
const SEED_VAULT_ID = 'v0000000-0000-0000-0000-000000000001'
const SEED_USER_ID = 'u0000000-0000-0000-0000-000000000001'

const INITIAL_FOLDERS: Folder[] = [
  {
    id: 'f1000000-0000-0000-0000-000000000001',
    vault_id: SEED_VAULT_ID,
    parent_id: null,
    name: 'Research',
    sort_order: 0,
    created_at: '2026-09-20T10:00:00Z',
    updated_at: '2026-09-20T10:00:00Z',
  },
  {
    id: 'f1000000-0000-0000-0000-000000000002',
    vault_id: SEED_VAULT_ID,
    parent_id: 'f1000000-0000-0000-0000-000000000001',
    name: 'AI & Agents',
    sort_order: 0,
    created_at: '2026-09-21T10:00:00Z',
    updated_at: '2026-09-21T10:00:00Z',
  },
  {
    id: 'f1000000-0000-0000-0000-000000000003',
    vault_id: SEED_VAULT_ID,
    parent_id: null,
    name: 'Projects',
    sort_order: 1,
    created_at: '2026-09-20T10:00:00Z',
    updated_at: '2026-09-20T10:00:00Z',
  },
  {
    id: 'f1000000-0000-0000-0000-000000000004',
    vault_id: SEED_VAULT_ID,
    parent_id: null,
    name: 'Philosophy',
    sort_order: 2,
    created_at: '2026-09-22T10:00:00Z',
    updated_at: '2026-09-22T10:00:00Z',
  }
]

const INITIAL_NOTES: Note[] = [
  {
    id: 'n1000000-0000-0000-0000-000000000001',
    vault_id: SEED_VAULT_ID,
    folder_id: 'f1000000-0000-0000-0000-000000000002',
    title: 'Artificial Intelligence',
    slug: 'artificial-intelligence',
    content: `# Artificial Intelligence

Artificial Intelligence represents the computational synthesis of perception, reasoning, and deliberate action.

In the CryptGreg architecture, modern autonomous entities combine [[Neural Networks]] with symbolic reasoning and persistent context.

Key sub-domains under investigation:
- [[AI Agents]] — autonomous goal-directed systems
- [[Agent Economics]] — resource exchange and game-theoretic equilibrium
- [[Machine Learning]] — statistical inference foundations

#ai #research #foundations`,
    metadata: { tags: ['ai', 'research', 'foundations'], pinned: true },
    created_at: '2026-09-21T11:00:00Z',
    updated_at: '2026-09-28T18:00:00Z',
    deleted_at: null,
  },
  {
    id: 'n1000000-0000-0000-0000-000000000002',
    vault_id: SEED_VAULT_ID,
    folder_id: 'f1000000-0000-0000-0000-000000000002',
    title: 'AI Agents',
    slug: 'ai-agents',
    content: `# AI Agents

Autonomous agents are programs capable of perceiving their environment, reasoning over historical memory, and taking multi-step actions.

Core components:
1. **Planning Engine**: Hierarchical decomposition into sub-goals.
2. **Tool Execution**: Calling external APIs, databases, and code tools.
3. **Memory Vault**: Graph-based associative recall, similar to [[Bookmarks]]!

Agents are actively deployed in our simulation [[Eastern Paradise]] and coordinated via [[JEV]] economic incentives.

See also: [[Agent Economics]], [[Neural Networks]].

#ai #agents #simulation`,
    metadata: { tags: ['ai', 'agents', 'simulation'], pinned: true },
    created_at: '2026-09-22T14:30:00Z',
    updated_at: '2026-09-28T18:15:00Z',
    deleted_at: null,
  },
  {
    id: 'n1000000-0000-0000-0000-000000000003',
    vault_id: SEED_VAULT_ID,
    folder_id: 'f1000000-0000-0000-0000-000000000003',
    title: 'Eastern Paradise',
    slug: 'eastern-paradise',
    content: `# Eastern Paradise

Eastern Paradise is a living virtual world simulation governed by autonomous [[AI Agents]].

NPC inhabitants carry out lifecycles, participate in trade using [[JEV]], and organize settlements. 

The environment tests:
- Long-horizon agent behavior
- Multi-agent game theory
- Emerging cultural norms

Connections:
- Governed by [[JEV]] transactions
- Powered by [[AI Agents]]
- Modeled after [[Verdium Storm]] physics

#project #paradise #simulation`,
    metadata: { tags: ['project', 'paradise', 'simulation'], pinned: false },
    created_at: '2026-09-23T09:00:00Z',
    updated_at: '2026-09-28T17:40:00Z',
    deleted_at: null,
  },
  {
    id: 'n1000000-0000-0000-0000-000000000004',
    vault_id: SEED_VAULT_ID,
    folder_id: 'f1000000-0000-0000-0000-000000000003',
    title: 'JEV',
    slug: 'jev',
    content: `# JEV (Joint Economic Value)

JEV is the decentralized medium of value and computational staking across CryptGreg systems.

Applications:
- Staking for priority compute
- Reward distribution in [[Eastern Paradise]]
- Economic settlement between [[AI Agents]]

Related notes: [[Agent Economics]], [[Eastern Paradise]].

#finance #token #economics`,
    metadata: { tags: ['finance', 'token', 'economics'], pinned: false },
    created_at: '2026-09-24T12:00:00Z',
    updated_at: '2026-09-28T16:00:00Z',
    deleted_at: null,
  },
  {
    id: 'n1000000-0000-0000-0000-000000000005',
    vault_id: SEED_VAULT_ID,
    folder_id: 'f1000000-0000-0000-0000-000000000001',
    title: 'Agent Economics',
    slug: 'agent-economics',
    content: `# Agent Economics

The study of automated resource allocation, tokenized computational contracts, and game-theoretic stability between non-human market actors.

When [[AI Agents]] have private utility functions and access to currency like [[JEV]], new market equilibria emerge.

Core references: [[Artificial Intelligence]], [[JEV]].

#economics #ai #research`,
    metadata: { tags: ['economics', 'ai', 'research'], pinned: false },
    created_at: '2026-09-25T15:20:00Z',
    updated_at: '2026-09-27T11:00:00Z',
    deleted_at: null,
  },
  {
    id: 'n1000000-0000-0000-0000-000000000006',
    vault_id: SEED_VAULT_ID,
    folder_id: 'f1000000-0000-0000-0000-000000000001',
    title: 'Neural Networks',
    slug: 'neural-networks',
    content: `# Neural Networks

Deep neural network architectures form the statistical core of modern perception and language representation.

Connects to:
- [[Machine Learning]]
- [[Artificial Intelligence]]
- Embodied controllers in [[AI Agents]]

#machine-learning #neural-nets`,
    metadata: { tags: ['machine-learning', 'neural-nets'], pinned: false },
    created_at: '2026-09-26T08:00:00Z',
    updated_at: '2026-09-27T10:00:00Z',
    deleted_at: null,
  },
  {
    id: 'n1000000-0000-0000-0000-000000000007',
    vault_id: SEED_VAULT_ID,
    folder_id: 'f1000000-0000-0000-0000-000000000001',
    title: 'Machine Learning',
    slug: 'machine-learning',
    content: `# Machine Learning

The mathematical and algorithmic foundation of systems that improve from experience.

Hierarchy:
- Supervised & Unsupervised Learning
- Reinforcement Learning with Human/Environment Feedback
- [[Neural Networks]]
- [[Artificial Intelligence]]

#ml #foundations`,
    metadata: { tags: ['ml', 'foundations'], pinned: false },
    created_at: '2026-09-26T09:00:00Z',
    updated_at: '2026-09-26T09:00:00Z',
    deleted_at: null,
  },
  {
    id: 'n1000000-0000-0000-0000-000000000008',
    vault_id: SEED_VAULT_ID,
    folder_id: 'f1000000-0000-0000-0000-000000000004',
    title: 'Knowledge Vault Architecture',
    slug: 'knowledge-vault-architecture',
    content: `# Knowledge Vault Architecture

Principles for networked thought:
1. **Atoms of insight**: Keep notes modular and focused.
2. **Explicit links**: Prefer bi-directional [[Artificial Intelligence]] links over rigid hierarchies.
3. **Graph topology**: Let structure emerge naturally from [[Bookmarks]] connection graphs.

#pkm #knowledge #architecture`,
    metadata: { tags: ['pkm', 'knowledge', 'architecture'], pinned: false },
    created_at: '2026-09-27T13:00:00Z',
    updated_at: '2026-09-28T12:00:00Z',
    deleted_at: null,
  }
]

export class VaultStorage {
  private static instance: VaultStorage
  private vaultId: string = SEED_VAULT_ID
  private isDemoMode: boolean = false

  private constructor() {
    this.initLocalDataIfEmpty()
  }

  public static getInstance(): VaultStorage {
    if (!VaultStorage.instance) {
      VaultStorage.instance = new VaultStorage()
    }
    return VaultStorage.instance
  }

  public setDemoMode(demo: boolean) {
    this.isDemoMode = demo
  }

  public getIsDemoMode(): boolean {
    return this.isDemoMode
  }

  public getActiveVaultId(): string {
    return this.vaultId
  }

  public setActiveVaultId(id: string) {
    this.vaultId = id
  }

  // --- LOCAL REPOSITORY METHODS ---

  private initLocalDataIfEmpty() {
    const existingNotes = safeStorage.getItem(STORAGE_KEY_PREFIX + 'notes')
    if (!existingNotes) {
      safeStorage.setItem(STORAGE_KEY_PREFIX + 'vaults', JSON.stringify([{
        id: SEED_VAULT_ID,
        user_id: SEED_USER_ID,
        name: 'Personal Vault',
        slug: 'personal-vault',
        created_at: '2026-09-20T00:00:00Z',
        updated_at: '2026-09-28T19:00:00Z'
      }]))
      safeStorage.setItem(STORAGE_KEY_PREFIX + 'folders', JSON.stringify(INITIAL_FOLDERS))
      safeStorage.setItem(STORAGE_KEY_PREFIX + 'notes', JSON.stringify(INITIAL_NOTES))

      // Generate seed links
      this.reconcileAllLocalLinks(INITIAL_NOTES)
    }
  }

  public async getVault(): Promise<Vault> {
    const user = (await supabase.auth.getUser()).data.user
    if (user && !this.isDemoMode) {
      try {
        const { data, error } = await bookmarksDb
          .from('vaults')
          .select('*')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle()

        if (!error && data) {
          this.vaultId = data.id
          return data
        }

        // Provision default vault if none exists for this user
        const { data: newVault, error: createError } = await bookmarksDb
          .from('vaults')
          .insert({
            user_id: user.id,
            name: 'Personal Vault',
            slug: 'personal-vault'
          })
          .select('*')
          .single()

        if (!createError && newVault) {
          this.vaultId = newVault.id
          return newVault
        }
      } catch (err) {
        console.warn('Falling back to local vault due to:', err)
      }
    }

    // Local fallback
    const raw = safeStorage.getItem(STORAGE_KEY_PREFIX + 'vaults')
    const list: Vault[] = raw ? JSON.parse(raw) : []
    return list[0] || {
      id: SEED_VAULT_ID,
      user_id: SEED_USER_ID,
      name: 'Personal Vault',
      slug: 'personal-vault',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  }

  public async getFolders(): Promise<Folder[]> {
    const user = (await supabase.auth.getUser()).data.user
    if (user && !this.isDemoMode) {
      try {
        const { data, error } = await bookmarksDb
          .from('folders')
          .select('*')
          .eq('vault_id', this.vaultId)
          .order('sort_order', { ascending: true })

        if (!error && data) return data
      } catch (err) {
        console.warn('Error fetching cloud folders, using local:', err)
      }
    }

    const raw = safeStorage.getItem(STORAGE_KEY_PREFIX + 'folders')
    return raw ? JSON.parse(raw) : []
  }

  public async saveFolder(folder: Omit<Folder, 'id' | 'created_at' | 'updated_at'> & { id?: string }): Promise<Folder> {
    const now = new Date().toISOString()
    const newFolder: Folder = {
      id: folder.id || `f-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      vault_id: folder.vault_id || this.vaultId,
      parent_id: folder.parent_id,
      name: folder.name,
      sort_order: folder.sort_order ?? 0,
      created_at: now,
      updated_at: now
    }

    const user = (await supabase.auth.getUser()).data.user
    if (user && !this.isDemoMode) {
      try {
        await bookmarksDb.from('folders').upsert(newFolder)
      } catch (err) {
        console.warn('Failed cloud folder upsert:', err)
      }
    }

    // Update local storage
    const raw = safeStorage.getItem(STORAGE_KEY_PREFIX + 'folders')
    const folders: Folder[] = raw ? JSON.parse(raw) : []
    const idx = folders.findIndex(f => f.id === newFolder.id)
    if (idx >= 0) {
      folders[idx] = newFolder
    } else {
      folders.push(newFolder)
    }
    safeStorage.setItem(STORAGE_KEY_PREFIX + 'folders', JSON.stringify(folders))
    return newFolder
  }

  public async deleteFolder(folderId: string): Promise<void> {
    const user = (await supabase.auth.getUser()).data.user
    if (user && !this.isDemoMode) {
      try {
        await bookmarksDb.from('folders').delete().eq('id', folderId)
      } catch (err) {
        console.warn('Failed cloud folder delete:', err)
      }
    }

    const raw = safeStorage.getItem(STORAGE_KEY_PREFIX + 'folders')
    const folders: Folder[] = raw ? JSON.parse(raw) : []
    const updated = folders.filter(f => f.id !== folderId && f.parent_id !== folderId)
    safeStorage.setItem(STORAGE_KEY_PREFIX + 'folders', JSON.stringify(updated))
  }

  public async getNotes(includeDeleted = false): Promise<Note[]> {
    const user = (await supabase.auth.getUser()).data.user
    if (user && !this.isDemoMode) {
      try {
        let query = bookmarksDb
          .from('notes')
          .select('*')
          .eq('vault_id', this.vaultId)
          .order('updated_at', { ascending: false })

        if (!includeDeleted) {
          query = query.is('deleted_at', null)
        }

        const { data, error } = await query
        if (!error && data) return data
      } catch (err) {
        console.warn('Error fetching cloud notes, using local:', err)
      }
    }

    const raw = safeStorage.getItem(STORAGE_KEY_PREFIX + 'notes')
    const notes: Note[] = raw ? JSON.parse(raw) : []
    return includeDeleted ? notes : notes.filter(n => !n.deleted_at)
  }

  public async getNote(id: string): Promise<Note | null> {
    const notes = await this.getNotes(true)
    return notes.find(n => n.id === id) || null
  }

  public async saveNote(note: Partial<Note> & { title: string; content: string }): Promise<Note> {
    const now = new Date().toISOString()
    const id = note.id || `n-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
    const slug = note.slug || generateSlug(note.title)
    const tags = extractTags(note.content)

    const updatedNote: Note = {
      id,
      vault_id: note.vault_id || this.vaultId,
      folder_id: note.folder_id ?? null,
      title: note.title.trim() || 'Untitled',
      slug,
      content: note.content,
      metadata: {
        ...(note.metadata || {}),
        tags
      },
      created_at: note.created_at || now,
      updated_at: now,
      deleted_at: note.deleted_at ?? null
    }

    const user = (await supabase.auth.getUser()).data.user
    if (user && !this.isDemoMode) {
      try {
        await bookmarksDb.from('notes').upsert(updatedNote)
      } catch (err) {
        console.warn('Cloud note save failed:', err)
      }
    }

    // Update local storage
    const raw = safeStorage.getItem(STORAGE_KEY_PREFIX + 'notes')
    const notes: Note[] = raw ? JSON.parse(raw) : []
    const idx = notes.findIndex(n => n.id === updatedNote.id)
    if (idx >= 0) {
      notes[idx] = updatedNote
    } else {
      notes.unshift(updatedNote)
    }
    safeStorage.setItem(STORAGE_KEY_PREFIX + 'notes', JSON.stringify(notes))

    // Reconcile links
    await this.reconcileNoteLinks(updatedNote, notes)

    // Save version snapshot periodically
    this.createVersionSnapshot(updatedNote)

    return updatedNote
  }

  public async softDeleteNote(noteId: string): Promise<void> {
    const now = new Date().toISOString()
    const user = (await supabase.auth.getUser()).data.user
    if (user && !this.isDemoMode) {
      try {
        await bookmarksDb.from('notes').update({ deleted_at: now }).eq('id', noteId)
      } catch (err) {
        console.warn('Cloud soft delete failed:', err)
      }
    }

    const raw = safeStorage.getItem(STORAGE_KEY_PREFIX + 'notes')
    const notes: Note[] = raw ? JSON.parse(raw) : []
    const note = notes.find(n => n.id === noteId)
    if (note) {
      note.deleted_at = now
      note.updated_at = now
      safeStorage.setItem(STORAGE_KEY_PREFIX + 'notes', JSON.stringify(notes))
    }
  }

  public async restoreNote(noteId: string): Promise<void> {
    const user = (await supabase.auth.getUser()).data.user
    if (user && !this.isDemoMode) {
      try {
        await bookmarksDb.from('notes').update({ deleted_at: null }).eq('id', noteId)
      } catch (err) {
        console.warn('Cloud note restore failed:', err)
      }
    }

    const raw = safeStorage.getItem(STORAGE_KEY_PREFIX + 'notes')
    const notes: Note[] = raw ? JSON.parse(raw) : []
    const note = notes.find(n => n.id === noteId)
    if (note) {
      note.deleted_at = null
      note.updated_at = new Date().toISOString()
      safeStorage.setItem(STORAGE_KEY_PREFIX + 'notes', JSON.stringify(notes))
    }
  }

  public async permanentlyDeleteNote(noteId: string): Promise<void> {
    const user = (await supabase.auth.getUser()).data.user
    if (user && !this.isDemoMode) {
      try {
        await bookmarksDb.from('notes').delete().eq('id', noteId)
      } catch (err) {
        console.warn('Cloud permanent note delete failed:', err)
      }
    }

    const raw = safeStorage.getItem(STORAGE_KEY_PREFIX + 'notes')
    const notes: Note[] = raw ? JSON.parse(raw) : []
    const updated = notes.filter(n => n.id !== noteId)
    safeStorage.setItem(STORAGE_KEY_PREFIX + 'notes', JSON.stringify(updated))

    // Remove any links connected to this note
    const rawLinks = safeStorage.getItem(STORAGE_KEY_PREFIX + 'links')
    const links: NoteLink[] = rawLinks ? JSON.parse(rawLinks) : []
    const filteredLinks = links.filter(l => l.source_note_id !== noteId && l.target_note_id !== noteId)
    safeStorage.setItem(STORAGE_KEY_PREFIX + 'links', JSON.stringify(filteredLinks))
  }

  // --- LINKS RECONCILIATION ---

  public async getLinks(): Promise<NoteLink[]> {
    const user = (await supabase.auth.getUser()).data.user
    if (user && !this.isDemoMode) {
      try {
        const { data, error } = await bookmarksDb
          .from('note_links')
          .select('*')
          .eq('vault_id', this.vaultId)

        if (!error && data) return data
      } catch (err) {
        console.warn('Cloud links fetch failed:', err)
      }
    }

    const raw = safeStorage.getItem(STORAGE_KEY_PREFIX + 'links')
    return raw ? JSON.parse(raw) : []
  }

  public async reconcileNoteLinks(note: Note, allNotes: Note[]): Promise<void> {
    const parsedLinks = extractWikiLinks(note.content)
    const titleToNoteMap = new Map<string, Note>()
    for (const n of allNotes) {
      if (!n.deleted_at) {
        titleToNoteMap.set(n.title.toLowerCase().trim(), n)
      }
    }

    const newTargetNoteIds = new Set<string>()
    for (const pl of parsedLinks) {
      const target = titleToNoteMap.get(pl.targetTitle.toLowerCase().trim())
      if (target && target.id !== note.id) {
        newTargetNoteIds.add(target.id)
      }
    }

    // Fetch existing links for this source note
    const raw = safeStorage.getItem(STORAGE_KEY_PREFIX + 'links')
    let allLinks: NoteLink[] = raw ? JSON.parse(raw) : []

    // Remove existing links from this note
    allLinks = allLinks.filter(l => l.source_note_id !== note.id)

    // Add new links
    for (const targetId of newTargetNoteIds) {
      allLinks.push({
        id: `l-${note.id}-${targetId}`,
        vault_id: this.vaultId,
        source_note_id: note.id,
        target_note_id: targetId,
        link_text: null,
        created_at: new Date().toISOString()
      })
    }

    safeStorage.setItem(STORAGE_KEY_PREFIX + 'links', JSON.stringify(allLinks))

    // Reconcile to Supabase if authenticated
    const user = (await supabase.auth.getUser()).data.user
    if (user && !this.isDemoMode) {
      try {
        await bookmarksDb.from('note_links').delete().eq('source_note_id', note.id)
        if (newTargetNoteIds.size > 0) {
          const insertPayload = Array.from(newTargetNoteIds).map(targetId => ({
            vault_id: this.vaultId,
            source_note_id: note.id,
            target_note_id: targetId
          }))
          await bookmarksDb.from('note_links').insert(insertPayload)
        }
      } catch (err) {
        console.warn('Cloud links reconciliation failed:', err)
      }
    }
  }

  private reconcileAllLocalLinks(notes: Note[]) {
    const allLinks: NoteLink[] = []
    const titleToNoteMap = new Map<string, Note>()
    for (const n of notes) {
      titleToNoteMap.set(n.title.toLowerCase().trim(), n)
    }

    for (const note of notes) {
      const parsed = extractWikiLinks(note.content)
      for (const pl of parsed) {
        const target = titleToNoteMap.get(pl.targetTitle.toLowerCase().trim())
        if (target && target.id !== note.id) {
          const linkId = `l-${note.id}-${target.id}`
          if (!allLinks.some(l => l.id === linkId)) {
            allLinks.push({
              id: linkId,
              vault_id: this.vaultId,
              source_note_id: note.id,
              target_note_id: target.id,
              link_text: pl.alias || null,
              created_at: new Date().toISOString()
            })
          }
        }
      }
    }
    safeStorage.setItem(STORAGE_KEY_PREFIX + 'links', JSON.stringify(allLinks))
  }

  // --- VERSION HISTORY ---

  public async getVersions(noteId: string): Promise<NoteVersion[]> {
    const raw = safeStorage.getItem(STORAGE_KEY_PREFIX + 'versions_' + noteId)
    return raw ? JSON.parse(raw) : []
  }

  private createVersionSnapshot(note: Note) {
    const key = STORAGE_KEY_PREFIX + 'versions_' + note.id
    const raw = safeStorage.getItem(key)
    const versions: NoteVersion[] = raw ? JSON.parse(raw) : []

    const lastVer = versions[0]
    if (!lastVer || lastVer.content !== note.content) {
      const newVersion: NoteVersion = {
        id: `v-${Date.now()}`,
        note_id: note.id,
        version_number: versions.length + 1,
        title: note.title,
        content: note.content,
        metadata: note.metadata,
        created_at: new Date().toISOString(),
        created_by: SEED_USER_ID
      }
      versions.unshift(newVersion)
      if (versions.length > 20) versions.pop()
      safeStorage.setItem(key, JSON.stringify(versions))
    }
  }

  // --- TAGS ---

  public async getTags(): Promise<Tag[]> {
    const notes = await this.getNotes(false)
    const tagCountMap = new Map<string, number>()

    for (const note of notes) {
      const tags = note.metadata?.tags || []
      for (const t of tags) {
        tagCountMap.set(t, (tagCountMap.get(t) || 0) + 1)
      }
    }

    const tagsList: Tag[] = []
    for (const [name, count] of tagCountMap.entries()) {
      tagsList.push({
        id: `tag-${name}`,
        vault_id: this.vaultId,
        name,
        created_at: new Date().toISOString(),
        count
      })
    }

    return tagsList.sort((a, b) => (b.count || 0) - (a.count || 0))
  }
}

export const vaultStorage = VaultStorage.getInstance()
