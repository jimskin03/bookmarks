# Security Documentation — Bookmarks

## 1. Row-Level Security (RLS) Architecture

Every table in the `bookmarks` schema enforces PostgreSQL Row-Level Security:
```sql
alter table bookmarks.vaults enable row level security;
alter table bookmarks.folders enable row level security;
alter table bookmarks.notes enable row level security;
alter table bookmarks.note_links enable row level security;
alter table bookmarks.tags enable row level security;
alter table bookmarks.note_tags enable row level security;
alter table bookmarks.note_versions enable row level security;
alter table bookmarks.graph_layouts enable row level security;
alter table bookmarks.attachments enable row level security;
```

### 1.1 Ownership Verification
Ownership is rooted in the authenticated user's ID (`auth.uid()`):
```sql
create policy "Users can select own notes" on bookmarks.notes
  for select using (bookmarks.user_owns_vault(vault_id));
```

### 1.2 Preservation on Update
To prevent a malicious user from reassigning rows to another user's vault, all `UPDATE` policies enforce ownership in both `USING` and `WITH CHECK`:
```sql
create policy "Users can update own notes" on bookmarks.notes
  for update
  using (bookmarks.user_owns_vault(vault_id))
  with check (bookmarks.user_owns_vault(vault_id));
```

## 2. Key Hygiene

- **Public Key Only**: The frontend bundle exclusively uses publishable/anon keys.
- **No Service-Role Key**: The `service_role` secret is strictly excluded from client code.
- **Sanitized Exports**: ZIP export generation occurs purely in browser memory without sending vault files to external third-party servers.
