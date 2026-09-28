# BOOKMARKS — Detailed Implementation Plan

## 1. Project Definition

**Product name:** Bookmarks

**Purpose:**  
Bookmarks is a standalone cloud-based note-taking and personal knowledge-management web application for existing CryptGreg users.

The product should feel conceptually similar to an Obsidian vault, but it is **not an Obsidian clone** and it is **not a feature of any other CryptGreg service**.

The core experience is:

1. An existing CryptGreg user signs in with their CryptGreg account.
2. Bookmarks provides a private personal vault.
3. The user creates Markdown-based notes.
4. Notes can reference other notes using `[[Note Name]]`.
5. Those references automatically become connections.
6. The user can inspect connections as:
   - backlinks,
   - a graph,
   - a focused local graph,
   - a mind map.
7. Notes are stored in the cloud and available across the user's devices.
8. The user's Bookmarks data remains isolated from all other CryptGreg products.

---

# 2. Product Principles

These principles should guide all implementation decisions.

## 2.1 Standalone Product

Bookmarks gets its own:

- repository
- frontend
- deployment
- application code
- data model
- database schema
- storage namespace
- migrations
- tests
- documentation
- monitoring configuration

It must not depend on application-specific data from:

- Eastern Paradise
- Verdium Storm
- Expense Tracker
- Nightshift
- other CryptGreg applications

The only intentional relationship to the existing CryptGreg platform is **user identity/authentication**.

## 2.2 Shared Identity, Isolated Data

Use the existing CryptGreg authentication identity so an existing user does not need to create another account.

After authentication, Bookmarks operates independently.

Conceptually:

```text
CryptGreg Identity
       |
       | authentication only
       v
+------------------------+
|       Bookmarks        |
|------------------------|
| Vault                  |
| Notes                  |
| Folders                |
| Tags                   |
| Links                  |
| Graph                  |
| Mind Maps              |
| Versions               |
| Attachments            |
+------------------------+
```

Do not build application logic around data belonging to unrelated CryptGreg services.

## 2.3 Notes Are the Source of Truth

The canonical knowledge representation is the note content plus explicit note-to-note links.

The graph and mind map are derived views.

```text
Markdown Notes
     |
     +--> [[links]]
     |
     v
Note Link Graph
     |
     +--> Backlinks
     +--> Graph View
     +--> Mind Map
```

Never make a visual graph the primary storage format.

## 2.4 User Data Must Be Portable

The application should support exporting a user's vault to Markdown files.

Bookmarks should never intentionally trap the user's knowledge inside the service.

## 2.5 V1 Should Be Simple

Do not attempt to reproduce every Obsidian feature.

The first production-quality version should prioritize:

- reliable cloud notes
- fast editing
- note linking
- backlinks
- graph visualization
- basic mind maps
- search
- authentication
- secure isolation
- export

AI and advanced collaboration should come later.

---

# 3. Suggested Product Domain

Recommended:

```text
bookmarks.cryptgregresearch.org
```

Alternative:

```text
notes.cryptgregresearch.org
```

Use `bookmarks.cryptgregresearch.org` if the product name is intended to remain **Bookmarks**.

---

# 4. Repository

Create a dedicated repository.

Recommended:

```text
github.com/jimskin03/cryptgreg-bookmarks
```

Suggested local working directory:

```text
/workspace/cryptgreg-bookmarks
```

Do not implement Bookmarks inside another existing CryptGreg repository.

---

# 5. Recommended Technology Stack

## Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- accessible component primitives

## Markdown / editor

Evaluate:

- CodeMirror
- Lexical
- TipTap with Markdown support
- another mature editor with reliable selection/cursor APIs

The editor must support:

- Markdown
- keyboard shortcuts
- `[[note link]]` autocomplete
- headings
- emphasis
- code
- lists
- links
- blockquotes
- fenced code blocks

Avoid building a rich-text editor from scratch.

## Graph / mind-map

Start with one graph library and keep the data model independent from the library.

Candidates:

- React Flow
- Cytoscape.js
- D3

Use the library for rendering/layout, not for persistent business logic.

## Backend

Supabase:

- PostgreSQL
- Auth
- Realtime where useful
- Storage for attachments
- database functions only where justified

## Hosting

Use an independently deployable web host such as:

- Vercel
- Cloudflare Pages/Workers
- Render

Choose one based on the deployment workflow already preferred for CryptGreg.

---

# 6. High-Level Architecture

```text
                    Browser
                       |
             +---------+---------+
             |                   |
          UI layer         Local cache
             |                   |
             +---------+---------+
                       |
                 Supabase client
                       |
        +--------------+----------------+
        |              |                |
      Auth          Database         Storage
        |              |                |
        |          notes schema       files
        |              |
        |       +------+------+
        |       |             |
        |     notes       note_links
        |
        +---- existing CryptGreg identity
```

The frontend should use a public/publishable Supabase client key only.

Never expose a service-role/secret key in browser code.

---

# 7. Supabase Data Isolation

Use a dedicated PostgreSQL schema for Bookmarks.

Recommended schema:

```text
bookmarks
```

Tables:

```text
bookmarks.vaults
bookmarks.folders
bookmarks.notes
bookmarks.note_links
bookmarks.tags
bookmarks.note_tags
bookmarks.graph_layouts
bookmarks.note_versions
bookmarks.attachments
```

Optional later:

```text
bookmarks.daily_notes
bookmarks.saved_searches
bookmarks.mind_maps
bookmarks.mind_map_nodes
bookmarks.mind_map_edges
```

Do not create unnecessary tables in V1.

---

# 8. Core Database Model

## 8.1 `bookmarks.vaults`

Purpose: one or more logical vault containers per user.

Initial product policy: create one default vault per user.

Suggested columns:

```text
id              uuid primary key
user_id         uuid not null
name            text not null
slug            text not null
created_at      timestamptz not null
updated_at      timestamptz not null
```

Constraints:

- `user_id` references the authenticated CryptGreg identity
- unique vault slug within the appropriate owner scope
- no user can read another user's vault

Future multi-vault support can be enabled without changing the note model significantly.

## 8.2 `bookmarks.folders`

Suggested columns:

```text
id              uuid primary key
vault_id        uuid not null
parent_id       uuid null
name            text not null
sort_order      numeric/int not null
created_at      timestamptz not null
updated_at      timestamptz not null
```

`parent_id` enables nested folders.

Example:

```text
Projects
  Eastern Paradise
  CryptGreg
Research
  AI
  Finance
```

## 8.3 `bookmarks.notes`

Suggested columns:

```text
id              uuid primary key
vault_id        uuid not null
folder_id       uuid null
title           text not null
slug            text not null
content         text not null
metadata        jsonb not null default '{}'
created_at      timestamptz not null
updated_at      timestamptz not null
deleted_at      timestamptz null
```

Important:

- Store the canonical body as Markdown/plain text.
- Keep metadata flexible in JSONB initially.
- Do not store only rendered HTML.
- Soft-delete support is useful for Trash/Recovery.

## 8.4 `bookmarks.note_links`

Suggested columns:

```text
id              uuid primary key
vault_id        uuid not null
source_note_id  uuid not null
target_note_id  uuid not null
link_text       text null
created_at      timestamptz not null
```

Add an appropriate uniqueness rule to prevent duplicate normalized links.

The application should regenerate or reconcile this table from note content.

## 8.5 `bookmarks.tags`

Suggested columns:

```text
id              uuid primary key
vault_id        uuid not null
name            text not null
created_at      timestamptz not null
```

## 8.6 `bookmarks.note_tags`

Suggested columns:

```text
note_id         uuid not null
tag_id          uuid not null
created_at      timestamptz not null
```

Use a composite primary key if appropriate.

## 8.7 `bookmarks.note_versions`

Suggested columns:

```text
id              uuid primary key
note_id         uuid not null
version_number  bigint/int not null
title           text not null
content         text not null
metadata        jsonb not null default '{}'
created_at      timestamptz not null
created_by      uuid not null
```

V1 can retain revisions periodically rather than on every keystroke.

Recommended initial policy:

- autosave note state
- create a version on explicit save milestones or meaningful edits
- retain a bounded history

## 8.8 `bookmarks.graph_layouts`

Suggested columns:

```text
id              uuid primary key
vault_id        uuid not null
name            text not null
scope_type      text not null
root_note_id    uuid null
layout_data     jsonb not null
created_at      timestamptz not null
updated_at      timestamptz not null
```

Use this for user-specific visual layout preferences, not for canonical note relationships.

---

# 9. Authentication Integration

## Goal

Existing CryptGreg users should be able to sign in using the same CryptGreg identity.

The Bookmarks frontend should:

1. Detect an active session.
2. Redirect unauthenticated users to the CryptGreg authentication flow.
3. Return to Bookmarks after successful authentication.
4. Use the authenticated user's stable ID for ownership checks.

## Important

Do not use editable user metadata to authorize access.

Authorization should be based on the authenticated user ID and database RLS.

The frontend can know the current user ID, but the database must enforce ownership.

## First implementation task

Before writing the UI, verify how the current CryptGreg authentication system is exposed for a new standalone service:

- Supabase project
- auth domain/origin
- redirect URL requirements
- session/cookie behavior
- local development redirect
- production redirect
- email verification behavior
- existing auth providers

Document the verified configuration in:

```text
docs/AUTH.md
```

Do not guess authentication details.

---

# 10. Row-Level Security

RLS is mandatory.

Every Bookmarks table exposed to authenticated users must have appropriate RLS policies.

The fundamental ownership relationship should be:

```text
authenticated user
        |
        v
vault.user_id
        |
        v
notes.vault_id
```

Do not use:

```text
TO authenticated
```

as the entire authorization rule.

Being authenticated is not sufficient.

The policies must verify ownership through the user's vault or an equivalent owner relationship.

For UPDATE operations, enforce both:

- row ownership in `USING`
- ownership preservation in `WITH CHECK`

A user must not be able to update a row and transfer it to another user's vault.

After schema and RLS work:

1. run database security advisors
2. test authenticated owner access
3. test cross-user access
4. test anonymous access
5. test UPDATE/DELETE isolation
6. test nested relationships such as notes -> folders -> vaults

Document the test results.

---

# 11. Frontend Application Structure

Suggested structure:

```text
src/
├── app/
│   ├── router/
│   ├── providers/
│   └── auth/
│
├── components/
│   ├── layout/
│   ├── editor/
│   ├── notes/
│   ├── folders/
│   ├── search/
│   ├── backlinks/
│   ├── graph/
│   └── mindmap/
│
├── features/
│   ├── vault/
│   ├── notes/
│   ├── links/
│   ├── tags/
│   ├── versions/
│   ├── attachments/
│   └── export/
│
├── lib/
│   ├── supabase/
│   ├── markdown/
│   ├── parser/
│   ├── sync/
│   └── validation/
│
└── types/
```

Keep domain logic outside visual components.

---

# 12. Main UI

Desktop layout:

```text
+--------------------------------------------------------------+
| Bookmarks                     Search        + New      Account|
+-------------+-------------------------------+----------------+
|             |                               |                |
| Vault       |         Note editor          | Backlinks      |
|             |                               |                |
| Projects    |  Artificial Intelligence     | AI Agents      |
| Research    |                               | JEV            |
| Ideas       |  # Artificial Intelligence   | Research       |
| Journal     |                               |                |
|             |  Note content...             |                |
|             |                               |                |
+-------------+-------------------------------+----------------+
```

The sidebars must be collapsible.

Do not make the application overly complex.

The default user experience should be:

- click note
- read/edit
- create links
- continue working

---

# 13. Note Editor

The note editor is the most important UI component.

## Required behavior

- Markdown editing
- autosave
- cursor preservation
- keyboard navigation
- undo/redo
- fast rendering
- no full-page rerender on each keystroke
- link autocomplete
- tag autocomplete
- note title editing

## Link syntax

Support:

```text
[[AI Agents]]
```

And optionally:

```text
[[AI Agents|agent research]]
```

The target note is:

```text
AI Agents
```

while the visible text is:

```text
agent research
```

## Future syntax

Potentially later:

```text
[[Note#Heading]]
[[Note^block]]
```

Do not implement these until basic note linking is stable.

---

# 14. Note Autocomplete

When the user types:

```text
[[
```

open an autocomplete popup.

Example:

```text
+----------------------+
| AI Agents            |
| AI Research          |
| Artificial Intelligence|
| Agent Economics      |
+----------------------+
```

Features:

- fuzzy title search
- keyboard navigation
- Enter to insert
- Escape to close
- create missing note option

If the user creates:

```text
[[New Idea]]
```

and the note does not exist, offer:

```text
Create note "New Idea"
```

---

# 15. Link Parsing

The application needs a deterministic parser for:

```text
[[Note]]
```

and optionally:

```text
[[Note|Alias]]
```

Parsing should happen after note saves or in a controlled debounced workflow.

Do not run an expensive whole-vault parsing job every time a key is pressed.

Recommended flow:

```text
User edits note
      |
debounced autosave
      |
save Markdown
      |
parse links from this note
      |
calculate link diff
      |
insert/delete affected note_links
```

Only the changed note's relationships should be recalculated.

---

# 16. Backlinks

Opening a note should show:

```text
Backlinks

Eastern Paradise
AI Research
Agent Economics

3 linked notes
```

For every backlink:

- show note title
- optionally show short context/snippet
- clicking opens the source note

Also support an outgoing links section:

```text
Links

AI Agents
JEV
Agent Economics
```

---

# 17. Graph View

Implement two graph scopes.

## Global Graph

Shows the entire vault.

```text
              Note A
             /      \
         Note B     Note C
           |          |
         Note D      Note E
```

## Local Graph

Shows connections around the selected note.

Example:

```text
                 JEV
                  |
            Eastern Paradise
             /            \
       AI Agents       NPC Behavior
```

Controls:

- zoom
- pan
- center
- search
- depth 1/2/3+
- hide isolated nodes
- toggle labels
- click node to open note

The graph should not reload the entire React application when the user clicks a node.

---

# 18. Graph Performance

Plan for larger vaults from the beginning.

Potential performance problems:

- thousands of nodes
- thousands of edges
- repeated layout calculations
- unnecessary React rerenders
- expensive SVG redraws
- full graph rebuilding after a single edit

Mitigations:

- memoize graph data
- update only affected nodes/edges
- debounce parsing
- calculate layouts only when needed
- virtualize note lists
- use Canvas/WebGL when the selected graph library benefits from it
- limit local graph depth
- avoid re-running global layout on every note change

Do not calculate a new graph layout every time the user types one character.

---

# 19. Mind Map

Mind Map is a separate visualization mode.

## Input

User selects a note as the root.

```text
Root: Artificial Intelligence
```

## Output

```text
                  Artificial Intelligence
                           |
          +----------------+----------------+
          |                |                |
      AI Agents       Machine Learning   Robotics
          |                |
       +--+--+          +--+--+
       |     |          |     |
      JEV  Agents     Neural  Models
            Ethics    Networks
```

## Minimum functionality

- automatic hierarchical layout
- expand/collapse
- zoom
- pan
- click node to open note
- create child note
- connect existing note
- remove visual branch
- regenerate layout

## Important distinction

A mind map is partly a presentation/layout.

The canonical relationship remains the note graph.

Do not allow deletion of a visual branch to silently delete the underlying note.

---

# 20. Manual Graph/Mind-Map Editing

V1 should support only controlled editing:

### Create connection

```text
Note A -> Connect -> Note B
```

This should create:

```text
[[Note B]]
```

or another canonical link representation.

### Move node

Moving a node changes visual layout only.

### Delete link

Deleting an edge from the graph should remove the underlying note relationship after confirmation.

This keeps the visualization and note model consistent.

---

# 21. Search

## V1

Search:

- title
- Markdown content
- folder
- tags

Use PostgreSQL full-text search where appropriate.

Required UX:

```text
Search...
```

Results:

```text
Eastern Paradise
Research / AI

AI Agents
Research

JEV
Projects / Eastern Paradise
```

## V2

Add:

- fuzzy search
- semantic search
- recent notes
- saved searches

Do not make vector search a prerequisite for the MVP.

---

# 22. Tags

Support Markdown-like tags:

```text
#AI
#research
#project/eastern-paradise
```

The initial implementation can use tags stored in normalized tables.

Tags should be discoverable through:

- note metadata
- search
- tag browser
- filtering

Do not allow arbitrary unbounded tag behavior to create poor performance.

Normalize and index tag names.

---

# 23. Folders

Folders are organizational aids, not relationships.

A note can have:

```text
Folder:
Research/AI
```

while separately linking to:

```text
[[Eastern Paradise]]
[[JEV]]
```

Do not infer graph relationships merely because notes share a folder.

---

# 24. Autosave

Autosave should feel invisible.

Suggested behavior:

```text
Typing
  |
local state updates immediately
  |
debounced save
  |
Supabase update
  |
save confirmed
```

Display a small state indicator:

```text
Saving...
Saved
Offline
Sync error
```

Do not show intrusive notifications for every autosave.

---

# 25. Local Cache / Offline Support

Plan for offline-first behavior.

Minimum V1/V1.5:

- recently opened notes cached locally
- unsent note edits retained locally
- reconnect automatically
- queue pending writes

Later:

- full local vault cache
- robust synchronization queue
- conflict resolution
- service worker/PWA

A user's unsaved text must not disappear because the network temporarily failed.

---

# 26. Conflict Handling

The initial product is primarily single-user.

Therefore, the normal conflict scenario is:

```text
Laptop edit
Phone edit
```

not simultaneous multi-user collaboration.

V1 can use a simple last-write/dirty-state model plus local protection against overwriting unsynced edits.

When a true conflict is detected:

```text
Conflict detected

Your local version
Remote version

[Keep Local]
[Keep Remote]
[Compare]
```

Do not implement complex CRDT infrastructure until there is a real product requirement.

---

# 27. Attachments

Allow notes to reference files later.

Potential files:

- images
- PDFs
- text files

Use a dedicated storage namespace/bucket for Bookmarks.

Suggested conceptual path:

```text
bookmarks/<user-id>/<vault-id>/<attachment-id>
```

Storage policies must enforce user/vault ownership.

Do not expose private attachments as globally public URLs.

---

# 28. Note Version History

Provide a history panel:

```text
History
------------------------
28 Sep 2026 19:02
28 Sep 2026 18:44
27 Sep 2026 22:18
25 Sep 2026 01:03
```

Actions:

- view
- compare
- restore

Keep version storage bounded.

Potential retention policy later:

- recent revisions retained densely
- older revisions retained less frequently

---

# 29. Trash / Recovery

Deleted notes should initially be soft-deleted.

```text
Trash
-----------------------
Old Idea
Meeting Notes
Research Draft
```

Actions:

- restore
- permanently delete

A permanently deleted note should also clean up:

- note links
- tags
- layout references
- attachments where applicable

Do not immediately hard-delete important user content unless the user explicitly requests permanent deletion.

---

# 30. Export

Implement:

```text
Export Vault
```

Output:

```text
Bookmarks-Vault.zip

/
├── Projects/
│   ├── Eastern Paradise.md
│   └── CryptGreg.md
├── Research/
│   ├── AI Agents.md
│   └── JEV.md
├── Ideas/
└── attachments/
```

The exported Markdown should preserve:

```text
[[Note Links]]
#tags
```

and useful metadata.

Include an optional export manifest with:

- export date
- application version
- vault ID
- note count
- attachment count

---

# 31. Security Requirements

Before production, verify:

## Authentication

- no secret keys in client bundle
- secure session handling
- correct production redirect URLs
- logout actually ends the client session
- unauthorized users cannot access vault data

## Database

- RLS enabled
- correct SELECT policies
- correct INSERT policies
- correct UPDATE policies
- correct DELETE policies
- UPDATE has both ownership conditions
- cross-user access tests fail as expected

## Storage

- private bucket
- user-scoped paths
- authenticated access policies
- no accidental public exposure

## APIs / Functions

- no service-role key in browser
- no unauthenticated privileged endpoints
- no unsafe SECURITY DEFINER functions
- validate IDs and ownership server-side

---

# 32. Database Indexing

At minimum evaluate indexes for:

```text
vaults.user_id
folders.vault_id
folders.parent_id
notes.vault_id
notes.folder_id
notes.updated_at
notes.deleted_at
note_links.vault_id
note_links.source_note_id
note_links.target_note_id
tags.vault_id
note_tags.note_id
note_tags.tag_id
note_versions.note_id
attachments.vault_id
```

Add full-text search indexes when search implementation is finalized.

Do not blindly add indexes to every column.

After the schema is working, run database advisors and inspect query plans for important queries.

---

# 33. API / Data Access Pattern

Prefer domain functions/services on the frontend instead of spreading raw Supabase queries throughout components.

Example conceptual API:

```text
vaultService.getVault()
noteService.getNote()
noteService.createNote()
noteService.updateNote()
noteService.deleteNote()
linkService.updateLinksForNote()
graphService.getGraph()
searchService.searchNotes()
versionService.getHistory()
exportService.exportVault()
```

This keeps database-specific code isolated.

---

# 34. State Management

Do not introduce a heavy global state architecture unless necessary.

Separate state into:

### Server state

- notes
- folders
- tags
- links
- versions

### UI state

- selected note
- open panels
- graph zoom
- graph filters
- editor mode

### Local persistence

- unsaved draft
- offline queue
- recently opened notes

Use a lightweight, predictable approach.

---

# 35. URL Routing

Useful routes:

```text
/
 /login
 /vault
 /note/:noteId
 /graph
 /mindmap
 /search
 /trash
 /settings
```

Optional later:

```text
/mindmap/:rootNoteId
```

The URL should be able to represent the currently opened note so users can refresh/share within the service without losing context.

---

# 36. Keyboard Shortcuts

Useful shortcuts:

```text
Ctrl/Cmd + N       New note
Ctrl/Cmd + P       Quick switcher
Ctrl/Cmd + K       Search / command
Ctrl/Cmd + S       Force save
Ctrl/Cmd + Shift + F  Search vault
Ctrl/Cmd + Shift + G  Graph
Ctrl/Cmd + Shift + M  Mind map
```

Avoid assigning too many shortcuts.

---

# 37. Quick Switcher

A command palette is extremely useful for an Obsidian-like workflow.

Typing:

```text
Ctrl/Cmd + P
```

should allow:

```text
Search notes
Open note
Create note
Open graph
Open mind map
Open trash
Open settings
```

Quick-switching should search note titles and use fuzzy matching.

---

# 38. Daily Notes

Implement later, not required for first MVP.

Potential command:

```text
Create today's note
```

result:

```text
Journal/2026-09-28.md
```

Do not force a journaling workflow on all users.

---

# 39. AI Integration — Post-MVP

AI should remain optional.

Potential features:

```text
Ask my vault
Summarize note
Suggest connections
Suggest tags
Find related notes
Explain graph cluster
```

AI should operate on retrieved user-owned content only.

Do not send the entire vault to a model by default.

Use retrieval:

```text
Question
  |
search/retrieval
  |
small relevant note set
  |
AI
  |
answer + source notes
```

For suggested links, require explicit user approval before mutating note relationships.

---

# 40. Observability

Add production observability for:

- frontend errors
- sync failures
- save latency
- database errors
- authentication errors
- export failures
- graph performance

Track aggregate metrics, not note content.

Do not log private note bodies or attachment contents.

---

# 41. Testing Strategy

## Unit tests

Test:

- Markdown parsing
- `[[link]]` parsing
- alias parsing
- slug generation
- link reconciliation
- tag parsing
- graph construction
- graph filtering
- mind-map tree generation
- export generation

## Integration tests

Test:

- create vault
- create note
- update note
- delete note
- restore note
- create link
- remove link
- backlink retrieval
- graph retrieval
- version creation

## Security tests

At minimum create two test users:

```text
User A
User B
```

Verify:

```text
A cannot SELECT B's notes
A cannot UPDATE B's notes
A cannot DELETE B's notes
A cannot read B's attachments
A cannot manipulate B's graph layouts
```

Also test anonymous access.

## End-to-end tests

Test the actual browser workflow:

```text
login
 -> create note
 -> type [[Second Note]]
 -> create second note
 -> save
 -> reopen
 -> verify backlink
 -> open graph
 -> click node
 -> open note
```

---

# 42. Performance Targets

Initial targets:

### Note editor

Typing should remain responsive even when a note is large.

Do not rerender the entire application on each keystroke.

### Save

Normal note saves should feel near-instant locally, with network persistence happening in the background.

### Note list

Virtualize or paginate if the vault becomes large.

### Graph

Local graph should remain responsive for normal personal-vault sizes.

Global graph should have sensible limits when a vault becomes very large.

### Search

Use indexed search instead of downloading every note into the browser for every query.

---

# 43. Accessibility

Minimum requirements:

- keyboard navigation
- visible focus states
- semantic buttons
- accessible dialogs
- accessible autocomplete
- sufficient contrast
- screen-reader labels
- graph controls accessible without relying only on mouse input

The graph itself is inherently visual, so provide an accompanying node/relationship list.

---

# 44. Mobile Requirements

Do not make mobile an afterthought.

Mobile should support:

- opening notes
- editing notes
- note linking
- search
- quick note creation
- backlinks
- graph inspection
- basic mind map navigation

Desktop should be the main productivity experience.

Mobile should prioritize reading/editing over complex graph manipulation.

---

# 45. Settings

Initial settings:

```text
Account
Editor
Appearance
Autosave
Keyboard shortcuts
Export
Trash
```

Later:

```text
Graph defaults
Sync settings
AI settings
```

Do not create a large settings tree for V1.

---

# 46. Theme

CryptGreg identity can be present visually, but Bookmarks should have its own product identity.

Recommended direction:

- clean
- quiet
- research-oriented
- low visual noise
- strong typography
- comfortable reading width
- dark/light mode

Avoid making every CryptGreg service look like the same application.

Bookmarks should be recognizably CryptGreg, but still feel like a dedicated product.

---

# 47. Development Phases

## Phase 0 — Discovery and Architecture

Deliver:

```text
README.md
ARCHITECTURE.md
AUTH.md
DATA_MODEL.md
SECURITY.md
```

Tasks:

1. Create repository.
2. Create application skeleton.
3. Verify the existing CryptGreg authentication setup.
4. Verify whether the Bookmarks app can use the same Supabase Auth project.
5. Define redirect URLs.
6. Define dedicated `bookmarks` schema.
7. Define RLS ownership model.
8. Document all assumptions.

Acceptance criteria:

- repository builds
- local app runs
- authenticated identity can be detected
- no cross-service data dependency exists in the design

---

# 48. Phase 1 — Supabase Foundation

Tasks:

1. Create `bookmarks` schema.
2. Create vault table.
3. Create folder table.
4. Create notes table.
5. Create indexes.
6. Enable RLS.
7. Create ownership policies.
8. Create test users.
9. Test cross-user isolation.
10. Run database advisors.
11. Document migration process.

Acceptance criteria:

- User A can create/read/update/delete their own vault.
- User A cannot access User B's vault.
- Note operations remain inside the correct vault.
- Anonymous users cannot access private data.

---

# 49. Phase 2 — Basic Notes

Tasks:

1. Build authenticated application shell.
2. Create vault automatically for first-time users.
3. Build folder sidebar.
4. Build note list.
5. Build note editor.
6. Implement create note.
7. Implement rename note.
8. Implement autosave.
9. Implement delete/trash.
10. Implement note navigation.
11. Add empty states.
12. Add loading/error states.

Acceptance criteria:

```text
Sign in
 -> enter Bookmarks
 -> create folder
 -> create note
 -> edit note
 -> refresh browser
 -> note persists
```

No graph functionality is required yet.

---

# 50. Phase 3 — Markdown Linking

Tasks:

1. Implement `[[...]]` parser.
2. Implement link autocomplete.
3. Implement note creation from link.
4. Create `note_links` rows.
5. Reconcile link changes after saves.
6. Implement outgoing links.
7. Implement backlinks.
8. Add local snippets/context where useful.

Acceptance test:

```text
Create Note A
Create Note B

Edit A:
"See [[B]]"

Save A

Open B

Expected:
B shows A as backlink.
```

Then remove the link and confirm the backlink disappears.

---

# 51. Phase 4 — Search and Tags

Tasks:

1. Implement title search.
2. Implement content search.
3. Add full-text indexing.
4. Add tags.
5. Add tag filtering.
6. Build quick switcher.
7. Add recent notes.

Acceptance criteria:

- Search remains fast for normal personal-vault sizes.
- Search does not download the entire vault unnecessarily.
- Filters do not leak data across users.

---

# 52. Phase 5 — Graph

Tasks:

1. Build graph data service.
2. Load vault nodes.
3. Load vault edges.
4. Integrate graph renderer.
5. Implement global graph.
6. Implement local graph.
7. Add depth filter.
8. Add zoom/pan.
9. Add node click.
10. Open note from node.
11. Add performance safeguards.
12. Persist graph layout if required.

Acceptance criteria:

- graph accurately reflects note links
- deleting a link updates graph
- creating a link updates graph
- clicking a node opens the note
- graph remains responsive with a reasonably large test vault

---

# 53. Phase 6 — Mind Map

Tasks:

1. Select root note.
2. Build hierarchical tree from graph.
3. Implement automatic layout.
4. Implement collapse/expand.
5. Implement node selection.
6. Implement create child note.
7. Implement connect existing note.
8. Implement move node.
9. Store optional visual layout.
10. Add regeneration/reset.

Acceptance criteria:

- root note is always visible
- connected notes appear correctly
- layout changes do not mutate the note content unexpectedly
- visual deletion does not silently delete notes
- links remain consistent with the canonical note graph

---

# 54. Phase 7 — Sync / Offline

Tasks:

1. Add local draft persistence.
2. Track unsynced changes.
3. Queue failed writes.
4. Retry on reconnect.
5. Add sync status UI.
6. Detect basic conflicts.
7. Add recovery workflow.

Acceptance criteria:

```text
Disconnect network
 -> edit note
 -> close/reopen app
 -> local draft survives

Reconnect
 -> sync completes
 -> server has the change
```

---

# 55. Phase 8 — Version History and Export

Tasks:

1. Implement note version creation.
2. Implement history viewer.
3. Implement version restore.
4. Build Markdown exporter.
5. Build ZIP exporter.
6. Export attachments.
7. Add export manifest.
8. Test import/export round trip manually.

Acceptance criteria:

A user's vault can be exported and the resulting Markdown contains the original:

- note names
- Markdown
- note links
- tags
- folder structure

---

# 56. Phase 9 — Production Hardening

Tasks:

1. Security review.
2. RLS review.
3. Storage policy review.
4. Authentication review.
5. Dependency audit.
6. Error monitoring.
7. Performance profiling.
8. Mobile testing.
9. Accessibility testing.
10. Browser compatibility testing.
11. Backup/recovery verification.
12. Production deployment.
13. Post-deployment smoke tests.

---

# 57. Phase 10 — Optional AI

Only begin after the non-AI product is stable.

Potential sequence:

```text
semantic search
    ->
related note suggestions
    ->
vault Q&A
    ->
summaries
    ->
automatic tags
```

Every AI feature must respect:

- user ownership
- privacy
- explicit mutation consent
- cost limits
- auditability

---

# 58. Suggested MVP Scope

The first public MVP should contain:

```text
[Authentication]
[One personal vault]
[Folders]
[Markdown notes]
[Autosave]
[[Note Links]]
[Backlinks]
[Search]
[Tags]
[Global Graph]
[Local Graph]
[Basic Mind Map]
[Trash]
[Basic Version History]
[Export]
[Dark/Light Mode]
[Responsive Mobile UI]
```

This is enough to make Bookmarks a real product.

---

# 59. Explicitly Out of Scope for MVP

Do not build initially:

```text
Real-time multi-user collaborative editing
Complex CRDT synchronization
Plugins ecosystem
Public note publishing
Social features
Sharing permissions
Marketplace
AI copilot
Calendar system
Task/project management system
Whiteboard system
Complex block-level references
Complex database-style notes
Dozens of customization options
```

Those can be considered only after the core knowledge-vault experience is reliable.

---

# 60. Definition of Done

Bookmarks V1 is complete when all of the following are true.

## Identity

- existing CryptGreg user can authenticate
- no second account is required
- authentication redirects work in production

## Vault

- user receives a private vault
- folders work
- notes persist

## Editor

- Markdown editing works
- autosave works
- refresh does not lose saved content

## Linking

- `[[Note]]` works
- autocomplete works
- backlinks work
- outgoing links work
- link deletion updates relationships

## Graph

- global graph works
- local graph works
- node click opens notes
- graph does not expose another user's data

## Mind Map

- selected root works
- children render hierarchically
- nodes can be rearranged
- visual layout is separated from canonical note relationships

## Search

- title search works
- content search works
- tag filtering works

## Reliability

- trash/recovery works
- basic version history works
- export works

## Security

- RLS tests pass
- cross-user tests fail correctly
- no secret keys are exposed
- private storage is protected

## UX

- desktop usable
- mobile usable
- dark/light themes work
- keyboard workflow is functional

---

# 61. Recommended Initial File Set

Create these project-level documents early:

```text
README.md
ARCHITECTURE.md
AUTH.md
DATA_MODEL.md
SECURITY.md
MIGRATIONS.md
GRAPH_MODEL.md
SYNC.md
TESTING.md
DEPLOYMENT.md
```

The implementation plan itself should remain:

```text
BOOKMARKS_IMPLEMENTATION_PLAN.md
```

---

# 62. Recommended Execution Order

Do not develop all components in parallel.

Follow this order:

```text
1. Repository + app skeleton
          |
2. Authentication verification
          |
3. Supabase bookmarks schema
          |
4. RLS + security tests
          |
5. Vault + folders
          |
6. Notes + editor
          |
7. Autosave
          |
8. [[links]]
          |
9. Backlinks
          |
10. Search + tags
          |
11. Graph
          |
12. Mind map
          |
13. Offline/sync
          |
14. Versions + export
          |
15. Production hardening
          |
16. Optional AI
```

This order reduces rework because the graph and mind map depend on the note/link model.

---

# 63. First Implementation Sprint

The first concrete sprint should be limited to:

```text
[ ] Create github.com/jimskin03/cryptgreg-bookmarks
[ ] Create React/TypeScript app
[ ] Configure TypeScript and linting
[ ] Add Supabase client
[ ] Verify CryptGreg authentication integration
[ ] Create bookmarks database schema
[ ] Create vaults table
[ ] Create folders table
[ ] Create notes table
[ ] Add RLS
[ ] Add indexes
[ ] Create migration
[ ] Write security tests
[ ] Build authenticated shell
[ ] Automatically provision default vault
[ ] Display vault in UI
```

Do not start graph or mind-map implementation during this sprint.

The goal is to establish the secure standalone foundation first.

---

# 64. Final Product Model

The completed product should conceptually feel like:

```text
                         BOOKMARKS
                CryptGreg Personal Knowledge Vault

       +-------------------+-------------------+
       |                   |                   |
     Notes              Search              Graph
       |                                      |
       |                                  Mind Map
       |
    Markdown
       |
    [[Links]]
       |
  +----+----+----+
  |    |    |    |
 Note Note Note Note
```

The central rule is:

```text
Notes create knowledge.
Links create connections.
Graph visualizes connections.
Mind Map organizes connections.
Supabase stores everything securely in the cloud.
CryptGreg provides identity, not application coupling.
```

That separation should remain intact throughout the project.
