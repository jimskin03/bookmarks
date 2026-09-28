# Testing Guide — Bookmarks

## 1. Test Suite Structure

Bookmarks includes automated test suites powered by Vitest:

| Test File | Scope |
| :--- | :--- |
| `tests/linkParser.test.ts` | Extraction of `[[wiki-links]]`, alias parsing (`[[Note\|Alias]]`), code block stripping, `#tag` parsing, context snippets, and slug generation. |
| `tests/graphService.test.ts` | Global graph node & edge derivation, local graph BFS depth filtering (depth 1 to 3), and cycle-safe mind map tree construction. |
| `tests/exportService.test.ts` | Full vault ZIP generation, folder hierarchy preservation, and `manifest.json` generation. |

## 2. Running Tests

To run the complete test suite:
```bash
npm test
```

To run in watch mode:
```bash
npm run test:watch
```
