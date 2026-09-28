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

// RFC 4122 v4 UUID generator with standard browser and math fallbacks
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export function isValidUUID(id: string | null | undefined): boolean {
  if (!id) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
}

// Valid UUIDs for demo vault
export const DEMO_VAULT_ID = '00000000-0000-0000-0000-000000000001'
export const DEMO_USER_ID = '00000000-0000-0000-0000-000000000002'

const DEMO_FOLDER_RESEARCH = '00000000-0000-0000-0000-000000000011'
const DEMO_FOLDER_AI = '00000000-0000-0000-0000-000000000012'
const DEMO_FOLDER_PROJECTS = '00000000-0000-0000-0000-000000000013'
const DEMO_FOLDER_PHILOSOPHY = '00000000-0000-0000-0000-000000000014'

const DEMO_FOLDERS: Folder[] = [
  {
    id: DEMO_FOLDER_RESEARCH,
    vault_id: DEMO_VAULT_ID,
    parent_id: null,
    name: 'Research',
    sort_order: 0,
    created_at: '2026-09-20T10:00:00Z',
    updated_at: '2026-09-20T10:00:00Z',
  },
  {
    id: DEMO_FOLDER_AI,
    vault_id: DEMO_VAULT_ID,
    parent_id: DEMO_FOLDER_RESEARCH,
    name: 'AI & Agents',
    sort_order: 0,
    created_at: '2026-09-21T10:00:00Z',
    updated_at: '2026-09-21T10:00:00Z',
  },
  {
    id: DEMO_FOLDER_PROJECTS,
    vault_id: DEMO_VAULT_ID,
    parent_id: null,
    name: 'Projects',
    sort_order: 1,
    created_at: '2026-09-20T10:00:00Z',
    updated_at: '2026-09-20T10:00:00Z',
  },
  {
    id: DEMO_FOLDER_PHILOSOPHY,
    vault_id: DEMO_VAULT_ID,
    parent_id: null,
    name: 'Philosophy',
    sort_order: 2,
    created_at: '2026-09-22T10:00:00Z',
    updated_at: '2026-09-22T10:00:00Z',
  }
]

const DEMO_NOTES: Note[] = [
  {
    id: '00000000-0000-0000-0000-000000000101',
    vault_id: DEMO_VAULT_ID,
    folder_id: DEMO_FOLDER_AI,
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
    id: '00000000-0000-0000-0000-000000000102',
    vault_id: DEMO_VAULT_ID,
    folder_id: DEMO_FOLDER_AI,
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
    id: '00000000-0000-0000-0000-000000000103',
    vault_id: DEMO_VAULT_ID,
    folder_id: DEMO_FOLDER_PROJECTS,
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
    id: '00000000-0000-0000-0000-000000000104',
    vault_id: DEMO_VAULT_ID,
    folder_id: DEMO_FOLDER_PROJECTS,
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
    id: '00000000-0000-0000-0000-000000000105',
    vault_id: DEMO_VAULT_ID,
    folder_id: DEMO_FOLDER_RESEARCH,
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
    id: '00000000-0000-0000-0000-000000000106',
    vault_id: DEMO_VAULT_ID,
    folder_id: DEMO_FOLDER_RESEARCH,
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
    id: '00000000-0000-0000-0000-000000000107',
    vault_id: DEMO_VAULT_ID,
    folder_id: DEMO_FOLDER_RESEARCH,
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
    id: '00000000-0000-0000-0000-000000000108',
    vault_id: DEMO_VAULT_ID,
    folder_id: DEMO_FOLDER_PHILOSOPHY,
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
  private vaultId: string | null = null
  private currentUserId: string | null = null
  private isDemoMode: boolean = false
  private schemaMissing: boolean = false

  private constructor() {
    this.initDemoDataIfEmpty()
  }

  public static getInstance(): VaultStorage {
    if (!VaultStorage.instance) {
      VaultStorage.instance = new VaultStorage()
    }
    return VaultStorage.instance
  }

  public setDemoMode(demo: boolean) {
    this.isDemoMode = demo
    if (demo) {
      this.currentUserId = 'demo'
      this.vaultId = DEMO_VAULT_ID
      this.initDemoDataIfEmpty()
    } else {
      this.currentUserId = null
      this.vaultId = null
    }
  }

  public setCurrentUser(userId: string | null) {
    this.currentUserId = userId
    this.vaultId = null
  }

  public getIsDemoMode(): boolean {
    return this.isDemoMode
  }

  public getIsSchemaMissing(): boolean {
    return this.schemaMissing
  }

  public getActiveUserId(): string {
    if (this.isDemoMode) return 'demo'
    return this.currentUserId || 'anonymous'
  }

  public getActiveVaultId(): string {
    if (this.vaultId && isValidUUID(this.vaultId)) {
      return this.vaultId
    }
    if (this.isDemoMode) {
      return DEMO_VAULT_ID
    }
    if (this.currentUserId && isValidUUID(this.currentUserId)) {
      return this.currentUserId
    }
    return DEMO_VAULT_ID
  }

  private scopeKey(table: string): string {
    return `${STORAGE_KEY_PREFIX}${this.getActiveUserId()}_${table}`
  }

  // Initialize demo data strictly within the 'demo' namespace
  private initDemoDataIfEmpty() {
    const demoKey = `${STORAGE_KEY_PREFIX}demo_notes`
    const existing = safeStorage.getItem(demoKey)
    if (!existing || existing.includes('n-demo-01')) {
      safeStorage.setItem(`${STORAGE_KEY_PREFIX}demo_vaults`, JSON.stringify([{
        id: DEMO_VAULT_ID,
        user_id: DEMO_USER_ID,
        name: 'Demo Vault',
        slug: 'demo-vault',
        created_at: '2026-09-20T00:00:00Z',
        updated_at: '2026-09-28T19:00:00Z'
      }]))
      safeStorage.setItem(`${STORAGE_KEY_PREFIX}demo_folders`, JSON.stringify(DEMO_FOLDERS))
      safeStorage.setItem(demoKey, JSON.stringify(DEMO_NOTES))
      this.reconcileLocalLinks(DEMO_NOTES, 'demo')
    }
  }

  public async getVault(): Promise<Vault> {
    const user = (await supabase.auth.getUser()).data.user
    if (user && !this.isDemoMode) {
      this.currentUserId = user.id
      try {
        const { data, error } = await bookmarksDb
          .from('vaults')
          .select('*')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle()

        if (error) {
          if (error.code === 'PGRST106' || error.message?.includes('schema')) {
            this.schemaMissing = true
            console.error('Supabase schema "bookmarks" not exposed to PostgREST:', error.message)
          }
          throw error
        }

        this.schemaMissing = false

        if (data && isValidUUID(data.id)) {
          this.vaultId = data.id
          safeStorage.setItem(this.scopeKey('vaults'), JSON.stringify([data]))
          return data
        }

        // Auto-provision personal vault for new user with RFC 4122 v4 UUID
        const newVaultId = generateUUID()
        const { data: newVault, error: createError } = await bookmarksDb
          .from('vaults')
          .insert({
            id: newVaultId,
            user_id: user.id,
            name: 'Personal Vault',
            slug: 'personal-vault'
          })
          .select('*')
          .single()

        if (createError) {
          console.warn('Vault insert conflict/error, checking existing:', createError.message)
          const { data: existingVault } = await bookmarksDb
            .from('vaults')
            .select('*')
            .eq('user_id', user.id)
            .limit(1)
            .maybeSingle()

          if (existingVault && isValidUUID(existingVault.id)) {
            this.vaultId = existingVault.id
            safeStorage.setItem(this.scopeKey('vaults'), JSON.stringify([existingVault]))
            return existingVault
          }
          throw createError
        }

        if (newVault) {
          this.vaultId = newVault.id
          safeStorage.setItem(this.scopeKey('vaults'), JSON.stringify([newVault]))
          await this.seedInitialCloudNote(newVault.id)
          return newVault
        }
      } catch (err: any) {
        console.warn('Falling back to user-scoped local storage due to:', err?.message || err)
      }
    }

    // Isolated local fallback
    const raw = safeStorage.getItem(this.scopeKey('vaults'))
    const list: Vault[] = raw ? JSON.parse(raw) : []
    const firstValid = list.find(v => isValidUUID(v.id))
    const fallbackVault: Vault = firstValid || {
      id: this.getActiveVaultId(),
      user_id: this.getActiveUserId(),
      name: this.isDemoMode ? 'Demo Vault' : 'Personal Vault',
      slug: 'personal-vault',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    this.vaultId = fallbackVault.id
    return fallbackVault
  }

  private async seedInitialCloudNote(vaultId: string): Promise<Note | null> {
    if (!isValidUUID(vaultId)) return null
    try {
      const noteId = generateUUID()
      const welcomeNote: Note = {
        id: noteId,
        vault_id: vaultId,
        folder_id: null,
        title: 'Welcome to your Personal Vault',
        slug: 'welcome-to-your-personal-vault',
        content: `# Welcome to your Personal Vault

This is your private cloud-synced knowledge vault. Notes you write here belong exclusively to your CryptGreg account.

### How to use Bookmarks:
- Create references to new or existing notes by typing \`[[Note Title]]\`.
- Categorize your knowledge with \`#tags\`.
- Click **Graph** in the top navigation to see your interactive knowledge graph.
- Click **Mind Map** to view and organize hierarchical relationships.

Happy thinking!`,
        metadata: { tags: ['welcome', 'getting-started'] },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null
      }

      const { data, error } = await bookmarksDb.from('notes').insert(welcomeNote).select('*').single()
      if (!error && data) {
        safeStorage.setItem(this.scopeKey('notes'), JSON.stringify([data]))
        return data
      }
    } catch (err) {
      console.warn('Could not seed initial cloud note:', err)
    }
    return null
  }

  private async syncLocalNotesToCloud(vaultId: string, localNotes: Note[]): Promise<void> {
    if (!isValidUUID(vaultId)) return
    try {
      for (const note of localNotes) {
        const cloudNote: Note = {
          ...note,
          id: isValidUUID(note.id) ? note.id : generateUUID(),
          vault_id: vaultId,
          folder_id: (note.folder_id && isValidUUID(note.folder_id)) ? note.folder_id : null
        }
        await bookmarksDb.from('notes').upsert(cloudNote)
      }
    } catch (err) {
      console.warn('Syncing local notes to cloud failed:', err)
    }
  }

  public async getFolders(): Promise<Folder[]> {
    const user = (await supabase.auth.getUser()).data.user
    if (user && !this.isDemoMode && this.vaultId && isValidUUID(this.vaultId) && !this.schemaMissing) {
      try {
        const { data, error } = await bookmarksDb
          .from('folders')
          .select('*')
          .eq('vault_id', this.vaultId)
          .order('sort_order', { ascending: true })

        if (!error && data) {
          safeStorage.setItem(this.scopeKey('folders'), JSON.stringify(data))
          return data
        } else if (error) {
          console.warn('Error fetching cloud folders:', error.message)
        }
      } catch (err) {
        console.warn('Error fetching cloud folders, using local user cache:', err)
      }
    }

    const raw = safeStorage.getItem(this.scopeKey('folders'))
    return raw ? JSON.parse(raw) : []
  }

  public async saveFolder(folder: Omit<Folder, 'id' | 'created_at' | 'updated_at'> & { id?: string }): Promise<Folder> {
    const now = new Date().toISOString()
    const id = (folder.id && isValidUUID(folder.id)) ? folder.id : generateUUID()
    const vaultId = (folder.vault_id && isValidUUID(folder.vault_id)) ? folder.vault_id : this.getActiveVaultId()
    const parentId = (folder.parent_id && isValidUUID(folder.parent_id)) ? folder.parent_id : null

    const newFolder: Folder = {
      id,
      vault_id: vaultId,
      parent_id: parentId,
      name: folder.name.trim(),
      sort_order: folder.sort_order ?? 0,
      created_at: now,
      updated_at: now
    }

    const user = (await supabase.auth.getUser()).data.user
    if (user && !this.isDemoMode && !this.schemaMissing && isValidUUID(newFolder.vault_id)) {
      try {
        const { error } = await bookmarksDb.from('folders').upsert(newFolder)
        if (error) {
          console.error('Cloud folder save failed:', error.message)
        }
      } catch (err) {
        console.warn('Cloud folder upsert failed:', err)
      }
    }

    const raw = safeStorage.getItem(this.scopeKey('folders'))
    const folders: Folder[] = raw ? JSON.parse(raw) : []
    const idx = folders.findIndex(f => f.id === newFolder.id)
    if (idx >= 0) {
      folders[idx] = newFolder
    } else {
      folders.push(newFolder)
    }
    safeStorage.setItem(this.scopeKey('folders'), JSON.stringify(folders))
    return newFolder
  }

  public async deleteFolder(folderId: string): Promise<void> {
    const user = (await supabase.auth.getUser()).data.user
    if (user && !this.isDemoMode && !this.schemaMissing && isValidUUID(folderId)) {
      try {
        const { error } = await bookmarksDb.from('folders').delete().eq('id', folderId)
        if (error) {
          console.error('Cloud folder delete failed:', error.message)
        }
      } catch (err) {
        console.warn('Cloud folder delete failed:', err)
      }
    }

    const raw = safeStorage.getItem(this.scopeKey('folders'))
    const folders: Folder[] = raw ? JSON.parse(raw) : []
    const updated = folders.filter(f => f.id !== folderId && f.parent_id !== folderId)
    safeStorage.setItem(this.scopeKey('folders'), JSON.stringify(updated))
  }

  public async getNotes(includeDeleted = false): Promise<Note[]> {
    const user = (await supabase.auth.getUser()).data.user
    if (user && !this.isDemoMode && this.vaultId && isValidUUID(this.vaultId) && !this.schemaMissing) {
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
        if (!error && data) {
          if (data.length === 0) {
            const raw = safeStorage.getItem(this.scopeKey('notes'))
            const localNotes: Note[] = raw ? JSON.parse(raw) : []
            if (localNotes.length > 0) {
              await this.syncLocalNotesToCloud(this.vaultId, localNotes)
              const { data: synced } = await query
              if (synced && synced.length > 0) {
                safeStorage.setItem(this.scopeKey('notes'), JSON.stringify(synced))
                return synced
              }
            } else {
              const welcomed = await this.seedInitialCloudNote(this.vaultId)
              if (welcomed) return [welcomed]
            }
          }

          safeStorage.setItem(this.scopeKey('notes'), JSON.stringify(data))
          return data
        } else if (error) {
          console.warn('Error fetching cloud notes:', error.message)
        }
      } catch (err) {
        console.warn('Error fetching cloud notes, using user local cache:', err)
      }
    }

    // User-scoped local fallback
    const raw = safeStorage.getItem(this.scopeKey('notes'))
    let notes: Note[] = raw ? JSON.parse(raw) : []

    // If an authenticated user has zero notes, provide an initial welcome note in their private vault
    if (!this.isDemoMode && this.currentUserId && notes.length === 0 && !raw) {
      const initialUserNote: Note = {
        id: generateUUID(),
        vault_id: this.getActiveVaultId(),
        folder_id: null,
        title: 'Welcome to your Personal Vault',
        slug: 'welcome-to-your-personal-vault',
        content: `# Welcome to your Personal Vault

This is your private cloud-synced knowledge vault. Notes you write here belong exclusively to your CryptGreg account.

### How to use Bookmarks:
- Create references to new or existing notes by typing \`[[Note Title]]\`.
- Categorize your knowledge with \`#tags\`.
- Click **Graph** in the top navigation to see your interactive knowledge graph.
- Click **Mind Map** to view and organize hierarchical relationships.

Happy thinking!`,
        metadata: { tags: ['welcome', 'getting-started'] },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null
      }
      notes = [initialUserNote]
      safeStorage.setItem(this.scopeKey('notes'), JSON.stringify(notes))
    }

    return includeDeleted ? notes : notes.filter(n => !n.deleted_at)
  }

  public async getNote(id: string): Promise<Note | null> {
    const notes = await this.getNotes(true)
    return notes.find(n => n.id === id) || null
  }

  public async saveNote(note: Partial<Note> & { title: string; content: string }): Promise<Note> {
    const now = new Date().toISOString()
    const id = (note.id && isValidUUID(note.id)) ? note.id : generateUUID()
    const slug = note.slug || generateSlug(note.title)
    const tags = extractTags(note.content)
    const vaultId = (note.vault_id && isValidUUID(note.vault_id)) ? note.vault_id : this.getActiveVaultId()
    const folderId = (note.folder_id && isValidUUID(note.folder_id)) ? note.folder_id : null

    const updatedNote: Note = {
      id,
      vault_id: vaultId,
      folder_id: folderId,
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
    if (user && !this.isDemoMode && !this.schemaMissing && isValidUUID(updatedNote.vault_id)) {
      try {
        const { error } = await bookmarksDb.from('notes').upsert(updatedNote)
        if (error) {
          console.error('Cloud note save failed:', error.message)
        }
      } catch (err) {
        console.warn('Cloud note save exception:', err)
      }
    }

    // Save in user-scoped local storage
    const raw = safeStorage.getItem(this.scopeKey('notes'))
    const notes: Note[] = raw ? JSON.parse(raw) : []
    const idx = notes.findIndex(n => n.id === updatedNote.id)
    if (idx >= 0) {
      notes[idx] = updatedNote
    } else {
      notes.unshift(updatedNote)
    }
    safeStorage.setItem(this.scopeKey('notes'), JSON.stringify(notes))

    // Reconcile links
    await this.reconcileNoteLinks(updatedNote, notes)
    this.createVersionSnapshot(updatedNote)

    return updatedNote
  }

  public async softDeleteNote(noteId: string): Promise<void> {
    const now = new Date().toISOString()
    const user = (await supabase.auth.getUser()).data.user
    if (user && !this.isDemoMode && !this.schemaMissing && isValidUUID(noteId)) {
      try {
        const { error } = await bookmarksDb.from('notes').update({ deleted_at: now }).eq('id', noteId)
        if (error) console.error('Cloud soft delete failed:', error.message)
      } catch (err) {
        console.warn('Cloud soft delete failed:', err)
      }
    }

    const raw = safeStorage.getItem(this.scopeKey('notes'))
    const notes: Note[] = raw ? JSON.parse(raw) : []
    const note = notes.find(n => n.id === noteId)
    if (note) {
      note.deleted_at = now
      note.updated_at = now
      safeStorage.setItem(this.scopeKey('notes'), JSON.stringify(notes))
    }
  }

  public async restoreNote(noteId: string): Promise<void> {
    const user = (await supabase.auth.getUser()).data.user
    if (user && !this.isDemoMode && !this.schemaMissing && isValidUUID(noteId)) {
      try {
        const { error } = await bookmarksDb.from('notes').update({ deleted_at: null }).eq('id', noteId)
        if (error) console.error('Cloud note restore failed:', error.message)
      } catch (err) {
        console.warn('Cloud note restore failed:', err)
      }
    }

    const raw = safeStorage.getItem(this.scopeKey('notes'))
    const notes: Note[] = raw ? JSON.parse(raw) : []
    const note = notes.find(n => n.id === noteId)
    if (note) {
      note.deleted_at = null
      note.updated_at = new Date().toISOString()
      safeStorage.setItem(this.scopeKey('notes'), JSON.stringify(notes))
    }
  }

  public async permanentlyDeleteNote(noteId: string): Promise<void> {
    const user = (await supabase.auth.getUser()).data.user
    if (user && !this.isDemoMode && !this.schemaMissing && isValidUUID(noteId)) {
      try {
        const { error } = await bookmarksDb.from('notes').delete().eq('id', noteId)
        if (error) console.error('Cloud permanent note delete failed:', error.message)
      } catch (err) {
        console.warn('Cloud permanent note delete failed:', err)
      }
    }

    const raw = safeStorage.getItem(this.scopeKey('notes'))
    const notes: Note[] = raw ? JSON.parse(raw) : []
    const updated = notes.filter(n => n.id !== noteId)
    safeStorage.setItem(this.scopeKey('notes'), JSON.stringify(updated))

    const rawLinks = safeStorage.getItem(this.scopeKey('links'))
    const links: NoteLink[] = rawLinks ? JSON.parse(rawLinks) : []
    const filteredLinks = links.filter(l => l.source_note_id !== noteId && l.target_note_id !== noteId)
    safeStorage.setItem(this.scopeKey('links'), JSON.stringify(filteredLinks))
  }

  // --- LINKS RECONCILIATION ---

  public async getLinks(): Promise<NoteLink[]> {
    const user = (await supabase.auth.getUser()).data.user
    if (user && !this.isDemoMode && this.vaultId && isValidUUID(this.vaultId) && !this.schemaMissing) {
      try {
        const { data, error } = await bookmarksDb
          .from('note_links')
          .select('*')
          .eq('vault_id', this.vaultId)

        if (!error && data) {
          safeStorage.setItem(this.scopeKey('links'), JSON.stringify(data))
          return data
        } else if (error) {
          console.warn('Cloud links fetch failed:', error.message)
        }
      } catch (err) {
        console.warn('Cloud links fetch failed:', err)
      }
    }

    const raw = safeStorage.getItem(this.scopeKey('links'))
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
      if (target && target.id !== note.id && isValidUUID(target.id)) {
        newTargetNoteIds.add(target.id)
      }
    }

    const raw = safeStorage.getItem(this.scopeKey('links'))
    let allLinks: NoteLink[] = raw ? JSON.parse(raw) : []
    allLinks = allLinks.filter(l => l.source_note_id !== note.id)

    const vaultId = this.getActiveVaultId()

    for (const targetId of newTargetNoteIds) {
      allLinks.push({
        id: generateUUID(),
        vault_id: vaultId,
        source_note_id: note.id,
        target_note_id: targetId,
        link_text: null,
        created_at: new Date().toISOString()
      })
    }

    safeStorage.setItem(this.scopeKey('links'), JSON.stringify(allLinks))

    const user = (await supabase.auth.getUser()).data.user
    if (user && !this.isDemoMode && !this.schemaMissing && isValidUUID(vaultId) && isValidUUID(note.id)) {
      try {
        await bookmarksDb.from('note_links').delete().eq('source_note_id', note.id)
        if (newTargetNoteIds.size > 0) {
          const insertPayload = Array.from(newTargetNoteIds).map(targetId => ({
            id: generateUUID(),
            vault_id: vaultId,
            source_note_id: note.id,
            target_note_id: targetId
          }))
          const { error } = await bookmarksDb.from('note_links').insert(insertPayload)
          if (error) {
            console.error('Cloud note links insert error:', error.message)
          }
        }
      } catch (err) {
        console.warn('Cloud links reconciliation failed:', err)
      }
    }
  }

  private reconcileLocalLinks(notes: Note[], userId: string) {
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
          const linkId = generateUUID()
          allLinks.push({
            id: linkId,
            vault_id: this.getActiveVaultId(),
            source_note_id: note.id,
            target_note_id: target.id,
            link_text: pl.alias || null,
            created_at: new Date().toISOString()
          })
        }
      }
    }
    safeStorage.setItem(`${STORAGE_KEY_PREFIX}${userId}_links`, JSON.stringify(allLinks))
  }

  // --- VERSION HISTORY ---

  public async getVersions(noteId: string): Promise<NoteVersion[]> {
    const raw = safeStorage.getItem(this.scopeKey(`versions_${noteId}`))
    return raw ? JSON.parse(raw) : []
  }

  private createVersionSnapshot(note: Note) {
    const key = this.scopeKey(`versions_${note.id}`)
    const raw = safeStorage.getItem(key)
    const versions: NoteVersion[] = raw ? JSON.parse(raw) : []

    const lastVer = versions[0]
    if (!lastVer || lastVer.content !== note.content) {
      const newVersion: NoteVersion = {
        id: generateUUID(),
        note_id: note.id,
        version_number: versions.length + 1,
        title: note.title,
        content: note.content,
        metadata: note.metadata,
        created_at: new Date().toISOString(),
        created_by: this.getActiveUserId()
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
        id: generateUUID(),
        vault_id: this.getActiveVaultId(),
        name,
        created_at: new Date().toISOString(),
        count
      })
    }

    return tagsList.sort((a, b) => (b.count || 0) - (a.count || 0))
  }
}

export const vaultStorage = VaultStorage.getInstance()
