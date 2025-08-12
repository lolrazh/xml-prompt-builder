# Site Improvements Proposal: XML Prompt Builder

## Summary
Comprehensive set of UX, accessibility, performance, SEO, and feature enhancements for `XML Prompt Builder`. This document proposes concrete steps without changing runtime behavior yet (proposal-only). It documents high-impact, low-risk changes plus a roadmap for advanced features.

## Quick wins
- Fix OpenGraph/Twitter social image path in `index.html` (currently `public/image.png`; replace with `public/page.png`).
- Add theme switcher using `next-themes`; expose light/dark toggle in header.
- Add `aria-label` to icon-only buttons in `Index.tsx` and `ElementTree.tsx`.
- Escape XML content on export in `PromptBuilder.tsx` to ensure valid XML (`& < > " '`).

## UX and usability
- Keyboard shortcuts: add (a) add element, (shift+a) add child, (del) delete, (alt+↑/↓) reorder, (space) collapse, (cmd/ctrl+c) copy.
- Drag-and-drop reordering via `@dnd-kit` instead of arrow buttons.
- Resizable panels with `react-resizable-panels` for builder/editor/preview.
- Autosave drafts: persist `elements` in `localStorage`; restore on load; “Reset” clears.
- Templates gallery: provide common starter XML structures (prompt skeletons, RSS, simple config).

## Power features
- Attributes and namespaces: extend `XMLElement` with `attributes: Record<string,string>` and support `ns:tag`. Update editor UI to manage attributes.
- CDATA and comments: preserve `<![CDATA[...]]>` and `<!-- ... -->`; toggle visibility in preview.
- Rich import/export: download/upload `.xml`, URL import, “Share link” (serialize to base64 in querystring).
- Token + cost: replace char/4 heuristic with real tokenizer (e.g., `gpt-tokenizer`/`tiktoken` web). Model selector + approximate cost.

## Performance and robustness
- Split `PromptBuilder.tsx` (~600 LOC) into smaller components and adopt `useReducer` (or Zustand) to manage tree state.
- Virtualize large trees for better performance.
- Move parsing/tokenizing to a Web Worker to avoid main-thread jank.
- Optional relaxed validation (basic well-formedness checks) with inline errors.

## Accessibility
- Ensure visible focus rings for all controls.
- Announce operations (add/delete/move) with `aria-live` or toasts.
- Verify color contrast for brand greens/yellows in light/dark themes.

## SEO, PWA, sharing
- Add canonical URL, `theme-color`, `og:url`, correct `og:image` size, and site name.
- Add `manifest.json`, multiple icon sizes, and service worker for installability/offline.
- Keep `robots.txt`; add `sitemap.xml` if more routes are added.

## Code quality and testing
- Unit tests for `loose-xml.ts` (balanced tags, nested depth, malformed input) and serialization (escaping, indentation).
- Centralize `XMLElement` in `src/types.ts` and import across modules.
- Replace ad-hoc IDs with `crypto.randomUUID()` consistently.

## Deployment & analytics
- Cloudflare: add preview/prod environments, cache headers for `/dist`, SPA 404 fallback.
- Add privacy-friendly analytics (Umami or Cloudflare Analytics).
- Add “Feedback” link to GitHub issues.

## Implementation plan (phased)
1. Quick wins + autosave + labels + escape XML + OG image fix.
2. Resizable panels + keyboard shortcuts + drag-and-drop.
3. Attributes/namespaces + import/export share link.
4. Tokenizer integration + worker offloading + tests.
5. PWA + SEO meta + analytics.

## Acceptance criteria
- All icon-only controls have accessible names.
- XML export escapes special chars; sample XML validates in standard parsers.
- State persists across reloads; “Reset” clears storage and UI.
- Social cards render with correct image when shared.
- No performance regressions on medium trees (~1k nodes) after virtualization.

## Out-of-scope (for now)
- XSD validation and advanced schema authoring.
- Full-blown collaborative editing.

## Screens/notes
- Current OG meta references `public/image.png`; repo has `public/page.png`.
- `PromptBuilder.tsx` handles paste/import; export currently inserts raw `element.content`.

---
If approved, I can follow up with an implementation PR addressing Phase 1 in small, reviewable edits.