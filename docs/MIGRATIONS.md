# Migrations Guide — Bookmarks

## 1. Running Database Migrations

The initial schema migration is located at:
`supabase/migrations/20260928_init_bookmarks.sql`

### Option A: Using Supabase SQL Editor
1. Log in to the CryptGreg Supabase Dashboard.
2. Navigate to **SQL Editor**.
3. Paste the contents of `supabase/migrations/20260928_init_bookmarks.sql`.
4. Click **Run**.

### Option B: Using Supabase CLI
```bash
supabase db push
```

## 2. Migration Contents

- Schema declaration: `create schema if not exists bookmarks;`
- Tables: `vaults`, `folders`, `notes`, `note_links`, `tags`, `note_tags`, `note_versions`, `graph_layouts`, `attachments`
- Triggers: `tr_notes_updated_at`, `tr_vaults_updated_at`
- Indexes: Foreign keys, `updated_at`, `deleted_at`, and Full-Text Search GIN index
- Row-Level Security: Comprehensive `USING` and `WITH CHECK` policies
