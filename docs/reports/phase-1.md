# Phase 1 Report — Scaffold and Engine-Agnostic Core

Date: 2026-08-03

Decision: **pass — Phase 1 complete.**

# Scope Completed

- Kept `MathLiveEngine` as the v1 engine after the corrected Phase 0 D28 pass.
- Added the normative hand-authored core catalog at `src/core/templates/core-catalog.json`.
- Added catalog validation, LaTeX command extraction, catalog merge helpers, Formula Library conversion, template ranking, recents/frequency/favorites usage state, and palette model helpers.
- Added a standalone DOM palette component with keyboard navigation, empty-query recents-first ordering, live query filtering, ArrowUp/ArrowDown navigation, Enter insertion, and Escape cancellation.
- Added `MathLiveEngine` behind the frozen `EditorEngine` contract.
- Added runtime serializer fixup support for D28's `middle-delimiter-brace` rule.
- Added real-browser Phase 1 smoke tests for MathLive template insertion and palette keyboard behavior.
- Copied production plugin artifacts into the `latex` vault at `.obsidian/plugins/structured-math/` using `npm run dev`.

# Reference Repos Used

- `/Users/gradyclopton/Projects/reference/obsidian-formula-library` at `ed25a986bca72c742dd1d2dc3777b607f0f5c79a`
- `/Users/gradyclopton/Projects/reference/mathlive-in-editor-mode` at `f47277fc1be0c0920a372bfb8cfcbd5e3b1e543a`
- `/Users/gradyclopton/Projects/reference/obsidian-mathlive` at `df125634f20443a68209e9b9bf9f83f0ed8f2da7`

# Acceptance Evidence

Engine smoke test: `tests/engine/phase1-browser.test.ts` bundles the real TypeScript modules into a browser page, mounts `MathLiveEngine`, selects `x+1`, inserts `\frac{#0}{\placeholder{}}`, types `2`, and verifies the resulting LaTeX is `\frac{x+1}{2}`. This demonstrates wrap-selection insertion and placeholder focus.

Palette smoke test: the same browser test mounts the standalone palette, verifies empty-query recents-first ordering (`fraction`, then `pmatrix`), drives ArrowDown and Enter to insert `pmatrix`, and types `\sin` to verify live filtering toward the `\sin` entry.

# Test Output

```text
npm run test:all

lint: passed
unit: 2 files passed, 7 tests passed
engine: 2 files passed, 7 tests passed
```

```text
npm run build

build: passed
```

```text
npm run dev

Copied plugin artifacts to /Users/gradyclopton/ObsidianVaults/latex/.obsidian/plugins/structured-math
```

# AGENT-DECIDED Notes

None during Phase 1.

# Known Limits

The Phase 1 plugin shell does not yet wire the editor extension into Obsidian. That is Phase 2. The installed vault artifacts only expose the current plugin command shell and are present so Phase 2 can begin testing in the latex vault immediately.

# Next

Proceed to Phase 2: in-place editing MVP in Obsidian's CodeMirror editor.
