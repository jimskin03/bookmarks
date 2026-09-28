export interface Vault {
  id: string
  user_id: string
  name: string
  slug: string
  created_at: string
  updated_at: string
}

export interface Folder {
  id: string
  vault_id: string
  parent_id: string | null
  name: string
  sort_order: number
  created_at: string
  updated_at: string
}

export interface NoteMetadata {
  tags?: string[]
  aliases?: string[]
  pinned?: boolean
  color?: string
  [key: string]: unknown
}

export interface Note {
  id: string
  vault_id: string
  folder_id: string | null
  title: string
  slug: string
  content: string
  metadata: NoteMetadata
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface NoteLink {
  id: string
  vault_id: string
  source_note_id: string
  target_note_id: string
  link_text: string | null
  created_at: string
}

export interface Tag {
  id: string
  vault_id: string
  name: string
  created_at: string
  count?: number
}

export interface NoteTag {
  note_id: string
  tag_id: string
  created_at: string
}

export interface NoteVersion {
  id: string
  note_id: string
  version_number: number
  title: string
  content: string
  metadata: NoteMetadata
  created_at: string
  created_by: string
}

export interface GraphLayout {
  id: string
  vault_id: string
  name: string
  scope_type: 'global' | 'local' | 'mindmap'
  root_note_id: string | null
  layout_data: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface Attachment {
  id: string
  vault_id: string
  note_id: string | null
  file_name: string
  file_path: string
  file_size: number
  mime_type: string | null
  created_at: string
}

export interface BacklinkItem {
  sourceNote: Note
  snippet: string
  linkText?: string
}

export interface OutgoingLinkItem {
  targetTitle: string
  targetNote?: Note
  exists: boolean
}

export interface GraphNode {
  id: string
  title: string
  folder_id: string | null
  tags: string[]
  linkCount: number
  color?: string
  // D3 force simulation attributes
  x?: number
  y?: number
  vx?: number
  vy?: number
  fx?: number | null
  fy?: number | null
}

export interface GraphEdge {
  id: string
  source: string | GraphNode
  target: string | GraphNode
  label?: string
}

export interface MindMapNode {
  id: string
  title: string
  tags?: string[]
  children: MindMapNode[]
  depth: number
  isCollapsed?: boolean
  parent?: MindMapNode
}

export type ViewMode = 'editor' | 'graph' | 'mindmap'
export type GraphScope = 'global' | 'local'
export type SyncStatus = 'saved' | 'saving' | 'offline' | 'error' | 'local_demo' | 'schema_missing'
export type ActiveTab = 'notes' | 'tags' | 'trash' | 'settings'
