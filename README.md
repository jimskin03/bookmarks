# Bookmarks — CryptGreg Personal Knowledge Vault

[![Build & Tests](https://img.shields.io/badge/tests-10%20passed-success)](https://github.com/jimskin03/bookmarks)
[![Status](https://img.shields.io/badge/status-active%20production-purple)](https://github.com/jimskin03/bookmarks)

**Bookmarks** is a standalone cloud-based note-taking and personal knowledge-management web application for CryptGreg users. Conceptually inspired by Obsidian, Bookmarks provides a private personal vault with Markdown notes, bi-directional `[[wiki-linking]]`, real-time backlinks, interactive 2D Force-Directed Knowledge Graphs (Global & Local), hierarchical Mind Maps, and full Markdown vault export.

---

## 🌟 Key Features

- **Notes are the Source of Truth**: Full Markdown editing with headings, lists, blockquotes, code, and inline `#tags`.
- **Bi-directional Knowledge Linking**:
  - Connect notes effortlessly using `[[Note Title]]` or `[[Note Title|Alias]]`.
  - Floating auto-complete popup as you type `[[` with fuzzy search and inline note creation.
  - Interactive clickable links in live preview.
- **Dynamic Backlinks & Outgoing Inspector**:
  - Automatically identifies all incoming references with surrounding sentence context snippets.
  - Inspects outgoing references with instant navigation or one-click stub note creation.
- **Interactive Knowledge Graph (D3 Force Simulation)**:
  - **Global Graph**: Visualizes the topology of your entire knowledge base.
  - **Local Graph**: Focused subgraph centered around your active note with configurable depth (1 to 3 hops).
  - Physics-based force repulsion and spring links with zoom, pan, hover neighborhood highlighting, and node click navigation.
  - Search filter and isolated node toggle.
- **Mind Map Explorer**:
  - Hierarchical mind map view with any note as the root.
  - Interactive pan/zoom and one-click child note creation that automatically writes `[[links]]` back to the parent note.
- **Universal CryptGreg Identity & Isolated Schema**:
  - Uses the shared CryptGreg Supabase authentication (`*.cryptgregresearch.org`).
  - Strict data isolation within PostgreSQL schema `bookmarks`.
  - Comprehensive Row-Level Security (RLS) guaranteeing private vaults.
  - Includes **Instant Demo Vault** mode with local persistence for immediate testing and offline capability.
- **Full Vault Portability (ZIP Export)**:
  - One-click export to an Obsidian-compatible `.zip` archive preserving folders, markdown files, links, tags, and `manifest.json`.
- **Keyboard-Driven Workflow**:
  - `⌘K` or `Ctrl+K` / `Ctrl+P`: Quick Switcher command palette.
  - `⌘N` or `Ctrl+N`: Create new note.
  - `Ctrl+Shift+G`: Open Knowledge Graph.
  - `Ctrl+Shift+M`: Open Mind Map.

---

## 🏗️ Technology Stack

- **Frontend**: React 18 / 19, TypeScript, Vite, Tailwind CSS, Lucide Icons
- **Visualizations**: D3 (`d3-force`, `d3-hierarchy`, `d3-zoom`, `d3-selection`)
- **Backend / Database**: Supabase (PostgreSQL, Row-Level Security, Auth)
- **Archive Engine**: JSZip
- **Test Suite**: Vitest

---

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18 (Tested on v24)
- npm or pnpm

### Installation

```bash
git clone https://github.com/jimskin03/bookmarks.git
cd bookmarks
npm install
```

### Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Running Automated Tests

```bash
npm test
```

### Production Build

```bash
npm run build
npm run preview
```

---

## 📂 Project Structure

```text
├── docs/                     # Architecture, security, auth, & data model guides
│   ├── ARCHITECTURE.md
│   ├── AUTH.md
│   ├── DATA_MODEL.md
│   ├── MIGRATIONS.md
│   ├── SECURITY.md
│   └── TESTING.md
├── src/
│   ├── components/
│   │   ├── auth/            # CryptGreg authentication & Demo Vault gate
│   │   ├── editor/          # Markdown editor with [[ autocomplete
│   │   ├── export/          # Obsidian-compatible vault ZIP exporter
│   │   ├── graph/           # D3 Force-Directed Global & Local Graph
│   │   ├── layout/          # Application header & view toggles
│   │   ├── mindmap/         # D3 hierarchical mind map view
│   │   ├── search/          # Quick Switcher (Ctrl+K/Ctrl+P) command palette
│   │   └── sidebar/         # Folder tree, tags list, trash recovery, backlinks
│   ├── features/            # Domain services (notes, links, folders, graph, search, export)
│   ├── hooks/               # React state hooks (useVault, useAuth)
│   ├── lib/                 # Supabase client, link parser, safe storage adapter
│   └── types/               # TypeScript interfaces (Vault, Note, Folder, Link, Tag)
├── supabase/
│   └── migrations/          # PostgreSQL schema 'bookmarks' with full RLS
├── tests/                   # Vitest unit & integration test suite
└── BOOKMARKS_IMPLEMENTATION_PLAN.md
```

---

## 📜 License

Private & Proprietary — CryptGreg Research.