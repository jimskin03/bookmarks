-- BOOKMARKS DATABASE MIGRATION
-- Schema: bookmarks
-- Dedicated schema for CryptGreg Bookmarks knowledge vault

create schema if not exists bookmarks;

-- Grant usage to standard Supabase roles
grant usage on schema bookmarks to postgres, anon, authenticated, service_role;

-- 1. Vaults Table
create table if not exists bookmarks.vaults (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Personal Vault',
  slug text not null default 'personal-vault',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_user_vault_slug unique (user_id, slug)
);

-- 2. Folders Table
create table if not exists bookmarks.folders (
  id uuid primary key default gen_random_uuid(),
  vault_id uuid not null references bookmarks.vaults(id) on delete cascade,
  parent_id uuid null references bookmarks.folders(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Notes Table
create table if not exists bookmarks.notes (
  id uuid primary key default gen_random_uuid(),
  vault_id uuid not null references bookmarks.vaults(id) on delete cascade,
  folder_id uuid null references bookmarks.folders(id) on delete set null,
  title text not null default 'Untitled',
  slug text not null,
  content text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

-- 4. Note Links Table (Bi-directional Knowledge Graph connections)
create table if not exists bookmarks.note_links (
  id uuid primary key default gen_random_uuid(),
  vault_id uuid not null references bookmarks.vaults(id) on delete cascade,
  source_note_id uuid not null references bookmarks.notes(id) on delete cascade,
  target_note_id uuid not null references bookmarks.notes(id) on delete cascade,
  link_text text null,
  created_at timestamptz not null default now(),
  constraint uq_note_link unique (vault_id, source_note_id, target_note_id)
);

-- 5. Tags Table
create table if not exists bookmarks.tags (
  id uuid primary key default gen_random_uuid(),
  vault_id uuid not null references bookmarks.vaults(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  constraint uq_vault_tag_name unique (vault_id, name)
);

-- 6. Note Tags Table
create table if not exists bookmarks.note_tags (
  note_id uuid not null references bookmarks.notes(id) on delete cascade,
  tag_id uuid not null references bookmarks.tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (note_id, tag_id)
);

-- 7. Note Versions Table (Revision history)
create table if not exists bookmarks.note_versions (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references bookmarks.notes(id) on delete cascade,
  version_number integer not null,
  title text not null,
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id) on delete cascade
);

-- 8. Graph Layouts Table (User layout persistence for custom graph/mindmap view preferences)
create table if not exists bookmarks.graph_layouts (
  id uuid primary key default gen_random_uuid(),
  vault_id uuid not null references bookmarks.vaults(id) on delete cascade,
  name text not null default 'default',
  scope_type text not null default 'global', -- 'global' or 'local' or 'mindmap'
  root_note_id uuid null references bookmarks.notes(id) on delete set null,
  layout_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 9. Attachments Table
create table if not exists bookmarks.attachments (
  id uuid primary key default gen_random_uuid(),
  vault_id uuid not null references bookmarks.vaults(id) on delete cascade,
  note_id uuid null references bookmarks.notes(id) on delete set null,
  file_name text not null,
  file_path text not null,
  file_size bigint not null default 0,
  mime_type text null,
  created_at timestamptz not null default now()
);

-- Indexes for performance
create index if not exists idx_vaults_user_id on bookmarks.vaults(user_id);
create index if not exists idx_folders_vault_id on bookmarks.folders(vault_id);
create index if not exists idx_folders_parent_id on bookmarks.folders(parent_id);
create index if not exists idx_notes_vault_id on bookmarks.notes(vault_id);
create index if not exists idx_notes_folder_id on bookmarks.notes(folder_id);
create index if not exists idx_notes_updated_at on bookmarks.notes(updated_at);
create index if not exists idx_notes_deleted_at on bookmarks.notes(deleted_at);
create index if not exists idx_notes_fts on bookmarks.notes using gin(to_tsvector('english', title || ' ' || content));
create index if not exists idx_note_links_vault on bookmarks.note_links(vault_id);
create index if not exists idx_note_links_source on bookmarks.note_links(source_note_id);
create index if not exists idx_note_links_target on bookmarks.note_links(target_note_id);
create index if not exists idx_tags_vault_id on bookmarks.tags(vault_id);
create index if not exists idx_note_tags_note_id on bookmarks.note_tags(note_id);
create index if not exists idx_note_tags_tag_id on bookmarks.note_tags(tag_id);
create index if not exists idx_note_versions_note_id on bookmarks.note_versions(note_id, version_number desc);

-- Automatic updated_at trigger function
create or replace function bookmarks.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace trigger tr_vaults_updated_at
  before update on bookmarks.vaults
  for each row execute function bookmarks.handle_updated_at();

create or replace trigger tr_folders_updated_at
  before update on bookmarks.folders
  for each row execute function bookmarks.handle_updated_at();

create or replace trigger tr_notes_updated_at
  before update on bookmarks.notes
  for each row execute function bookmarks.handle_updated_at();

create or replace trigger tr_graph_layouts_updated_at
  before update on bookmarks.graph_layouts
  for each row execute function bookmarks.handle_updated_at();

-- ROW-LEVEL SECURITY (RLS)
alter table bookmarks.vaults enable row level security;
alter table bookmarks.folders enable row level security;
alter table bookmarks.notes enable row level security;
alter table bookmarks.note_links enable row level security;
alter table bookmarks.tags enable row level security;
alter table bookmarks.note_tags enable row level security;
alter table bookmarks.note_versions enable row level security;
alter table bookmarks.graph_layouts enable row level security;
alter table bookmarks.attachments enable row level security;

-- Helper security function: check if authenticated user owns the vault
create or replace function bookmarks.user_owns_vault(v_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from bookmarks.vaults
    where id = v_id and user_id = auth.uid()
  );
end;
$$ language plpgsql security definer set search_path = bookmarks, public;

-- Helper security function: check if authenticated user owns the note
create or replace function bookmarks.user_owns_note(n_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from bookmarks.notes n
    join bookmarks.vaults v on n.vault_id = v.id
    where n.id = n_id and v.user_id = auth.uid()
  );
end;
$$ language plpgsql security definer set search_path = bookmarks, public;

-- RLS: Vaults
create policy "Users can select own vaults" on bookmarks.vaults
  for select using (auth.uid() = user_id);

create policy "Users can insert own vaults" on bookmarks.vaults
  for insert with check (auth.uid() = user_id);

create policy "Users can update own vaults" on bookmarks.vaults
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can delete own vaults" on bookmarks.vaults
  for delete using (auth.uid() = user_id);

-- RLS: Folders
create policy "Users can select own folders" on bookmarks.folders
  for select using (bookmarks.user_owns_vault(vault_id));

create policy "Users can insert own folders" on bookmarks.folders
  for insert with check (bookmarks.user_owns_vault(vault_id));

create policy "Users can update own folders" on bookmarks.folders
  for update using (bookmarks.user_owns_vault(vault_id)) with check (bookmarks.user_owns_vault(vault_id));

create policy "Users can delete own folders" on bookmarks.folders
  for delete using (bookmarks.user_owns_vault(vault_id));

-- RLS: Notes
create policy "Users can select own notes" on bookmarks.notes
  for select using (bookmarks.user_owns_vault(vault_id));

create policy "Users can insert own notes" on bookmarks.notes
  for insert with check (bookmarks.user_owns_vault(vault_id));

create policy "Users can update own notes" on bookmarks.notes
  for update using (bookmarks.user_owns_vault(vault_id)) with check (bookmarks.user_owns_vault(vault_id));

create policy "Users can delete own notes" on bookmarks.notes
  for delete using (bookmarks.user_owns_vault(vault_id));

-- RLS: Note Links
create policy "Users can select own note links" on bookmarks.note_links
  for select using (bookmarks.user_owns_vault(vault_id));

create policy "Users can insert own note links" on bookmarks.note_links
  for insert with check (bookmarks.user_owns_vault(vault_id));

create policy "Users can update own note links" on bookmarks.note_links
  for update using (bookmarks.user_owns_vault(vault_id)) with check (bookmarks.user_owns_vault(vault_id));

create policy "Users can delete own note links" on bookmarks.note_links
  for delete using (bookmarks.user_owns_vault(vault_id));

-- RLS: Tags
create policy "Users can select own tags" on bookmarks.tags
  for select using (bookmarks.user_owns_vault(vault_id));

create policy "Users can insert own tags" on bookmarks.tags
  for insert with check (bookmarks.user_owns_vault(vault_id));

create policy "Users can update own tags" on bookmarks.tags
  for update using (bookmarks.user_owns_vault(vault_id)) with check (bookmarks.user_owns_vault(vault_id));

create policy "Users can delete own tags" on bookmarks.tags
  for delete using (bookmarks.user_owns_vault(vault_id));

-- RLS: Note Tags
create policy "Users can select own note tags" on bookmarks.note_tags
  for select using (bookmarks.user_owns_note(note_id));

create policy "Users can insert own note tags" on bookmarks.note_tags
  for insert with check (bookmarks.user_owns_note(note_id));

create policy "Users can delete own note tags" on bookmarks.note_tags
  for delete using (bookmarks.user_owns_note(note_id));

-- RLS: Note Versions
create policy "Users can select own note versions" on bookmarks.note_versions
  for select using (bookmarks.user_owns_note(note_id));

create policy "Users can insert own note versions" on bookmarks.note_versions
  for insert with check (bookmarks.user_owns_note(note_id) and created_by = auth.uid());

-- RLS: Graph Layouts
create policy "Users can select own graph layouts" on bookmarks.graph_layouts
  for select using (bookmarks.user_owns_vault(vault_id));

create policy "Users can insert own graph layouts" on bookmarks.graph_layouts
  for insert with check (bookmarks.user_owns_vault(vault_id));

create policy "Users can update own graph layouts" on bookmarks.graph_layouts
  for update using (bookmarks.user_owns_vault(vault_id)) with check (bookmarks.user_owns_vault(vault_id));

create policy "Users can delete own graph layouts" on bookmarks.graph_layouts
  for delete using (bookmarks.user_owns_vault(vault_id));

-- RLS: Attachments
create policy "Users can select own attachments" on bookmarks.attachments
  for select using (bookmarks.user_owns_vault(vault_id));

create policy "Users can insert own attachments" on bookmarks.attachments
  for insert with check (bookmarks.user_owns_vault(vault_id));

create policy "Users can delete own attachments" on bookmarks.attachments
  for delete using (bookmarks.user_owns_vault(vault_id));

-- Permissions grant to authenticated role
grant all on all tables in schema bookmarks to authenticated;
grant all on all sequences in schema bookmarks to authenticated;
