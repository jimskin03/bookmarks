# Data Model Documentation — Bookmarks

## Schema: `bookmarks`

All tables belong to the dedicated PostgreSQL schema `bookmarks`.

### 1. `bookmarks.vaults`
Logical container for user notes. Defaults to 1 personal vault per user.
- `id` (uuid, PK)
- `user_id` (uuid, references `auth.users(id)`)
- `name` (text)
- `slug` (text)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### 2. `bookmarks.folders`
Hierarchical folders with nested `parent_id` support.
- `id` (uuid, PK)
- `vault_id` (uuid, references `bookmarks.vaults(id)`)
- `parent_id` (uuid null, self-referencing)
- `name` (text)
- `sort_order` (int)
- timestamps

### 3. `bookmarks.notes`
Core note entity storing canonical Markdown content.
- `id` (uuid, PK)
- `vault_id` (uuid, references `bookmarks.vaults(id)`)
- `folder_id` (uuid null, references `bookmarks.folders(id)`)
- `title` (text)
- `slug` (text)
- `content` (text)
- `metadata` (jsonb)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)
- `deleted_at` (timestamptz null for soft-delete)

### 4. `bookmarks.note_links`
Normalized knowledge graph edges.
- `id` (uuid, PK)
- `vault_id` (uuid)
- `source_note_id` (uuid, references `bookmarks.notes(id)`)
- `target_note_id` (uuid, references `bookmarks.notes(id)`)
- `link_text` (text null)
- `created_at` (timestamptz)
- `UNIQUE (vault_id, source_note_id, target_note_id)`

### 5. `bookmarks.tags` & `bookmarks.note_tags`
Indexed categorization tags extracted from Markdown `#tags`.

### 6. `bookmarks.note_versions`
Historical snapshots of notes recorded on save milestones.

### 7. `bookmarks.graph_layouts`
User visual graph and mind map positioning preferences.
