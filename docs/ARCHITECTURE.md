# Architecture Documentation — Bookmarks

## 1. System Overview

Bookmarks is architected as an independent, single-page web application with cloud persistence and local-first resilience.

```text
+--------------------------------------------------------------+
|                     Browser Client                           |
|  +---------------------+  +-------------------------------+  |
|  |     UI Layer        |  |        Local Cache            |  |
|  | (Editor, Graph, MM) |  | (SafeStorage / LocalStorage)  |  |
|  +----------+----------+  +---------------+---------------+  |
|             \                            /                   |
|              +------------+-------------+                    |
|                           |                                  |
|                 Domain Services Layer                        |
|        (noteService, linkService, graphService)              |
|                           |                                  |
+---------------------------|----------------------------------+
                            v
               Supabase Client (@supabase/supabase-js)
                            |
           +----------------+----------------+
           |                                 |
   Shared Auth (JWT)             PostgreSQL Schema 'bookmarks'
(cryptgregresearch.org)         (vaults, folders, notes, links)
```

## 2. Key Architecture Principles

### 2.1 Notes as the Source of Truth
Visualizations (Knowledge Graphs and Mind Maps) are derived directly from Markdown note content and parsed `[[wiki-links]]`. The visual representations never store persistent business state; editing note text or deleting links recalculates relationships deterministically.

### 2.2 Shared Identity, Isolated Data
Bookmarks leverages CryptGreg's central Supabase Auth project (`https://vlnocfdiexkqcnfbjhqt.supabase.co`). User identity is shared across subdomains via root-domain cookies (`*.cryptgregresearch.org`), but all Bookmarks application tables reside exclusively in the dedicated `bookmarks` PostgreSQL schema.

### 2.3 Local-First & Offline Resilience
The client uses `SafeStorage` to mirror all note updates immediately. When offline or unauthenticated, users have full access to an in-memory/localStorage Demo Vault. When online and authenticated, writes sync automatically to Supabase.

### 2.4 D3 Force Simulation Engine
Rather than relying on heavy layout libraries, graph rendering is powered by native D3 force physics (`d3-force`). This delivers 60fps canvas/SVG rendering, natural node repulsion, spring tension, and responsive zooming/panning across thousands of nodes.
