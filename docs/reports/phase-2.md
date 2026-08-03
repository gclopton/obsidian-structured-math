# Phase 2 Report — In-Document Editing MVP

Date: 2026-08-03

# Status

Phase 2 implementation is complete and ready for Checkpoint 2 review.

The plugin now registers an Obsidian CodeMirror extension that creates and edits active MathLive fields directly inside the note body. There is no primary modal, popup editor, detached workspace pane, or `Modal` usage in the editor path. The Markdown source remains the storage format, with MathLive hosted only as the active in-place editing surface.

# Implementation

The editor integration is centered on `src/editor/`. `math-ranges.ts` scans inline `$...$` and display `$$...$$` ranges using the CodeMirror syntax tree, then merges a conservative text fallback so tests and Obsidian Live Preview both see the same ranges. Display bodies normalize away the surrounding newlines, so `$$\nE=mc^2\n$$` edits as `E=mc^2` and serializes back to the clean block form.

`active-state.ts` owns the active equation as a CodeMirror `StateField`. It stores the source range, content range, activation-time source, current LaTeX, dirty flag, and focus side. It maps positions through transactions and drops stale active ranges if the source delimiters no longer match the active range. That stale-range guard was added after real vault automation exposed a possible corruption path during whole-document replacement.

`math-widget.ts` hosts `MathLiveEngine` inside a CodeMirror replace decoration. MathLive changes are immediately written back only to the active equation's content range. Escape reverts to activation-time source if dirty. Arrow and Tab boundary exits return the caret to the Markdown document outside the equation. The widget uses a focused DOM-preservation guard during composition so active typing does not remount the math field on every source transaction.

`extension.ts` wires the user workflow into Obsidian: typing `$` in text mode creates an active inline equation at the cursor, ArrowRight/ArrowLeft enter existing equations from the left/right boundaries, and the display command inserts `$$\n\n$$` and activates its body in place. `main.ts` registers that extension and the display command.

The Phase 1 palette component received one small hardening fix during this phase: focusing the standalone palette now blurs existing `math-field`s and repeats focus on the next tick, and it accepts normal `input` events as a fallback. This fixed a browser-suite focus race without changing the template model or assertions.

# Automated Verification

The full local gate passed after the Phase 2 implementation:

```text
npm run test:all && npm run build && npm run dev

lint: passed
unit: 3 files, 10 tests passed
engine/browser: 3 files, 13 tests passed
build: passed
dev copy: copied plugin artifacts to /Users/gradyclopton/ObsidianVaults/latex/.obsidian/plugins/structured-math
```

New Phase 2 browser acceptance coverage is in `tests/engine/phase2-browser.test.ts`. It proves that `$` creates inline math, the active field commits clean `$v=\frac{s}{t}$` source, ArrowRight exits and prose continues on the same line, activation/deactivation without edits is byte-neutral, Escape reverts to activation-time source, display math serializes to `$$\nE=mc^2\n$$`, undo after commit restores the prior equation source in one history operation, and stale active ranges are dropped after external document replacement.

New range-scanner unit coverage is in `tests/unit/math-ranges.test.ts`.

# Real Vault Evidence

Evidence is saved under `docs/reports/phase-2-demo/`.

The scripted Obsidian run against `/Users/gradyclopton/ObsidianVaults/latex` captured the main inline workflow:

```text
01-start.png
02-inline-active-empty.png
03-inline-built.png
04-inline-committed-prose.png
05-no-edit-active.png
```

That run opened `Phase 2 Checkpoint 2 Demo.md`, typed `$`, created an active inline MathLive field at the cursor, built `v=\frac{s}{t}`, exited right, continued prose on the same line, and activated an existing `$x+1$` equation without editing. The final file-byte evidence is:

```text
before.md
after.md
file-diff.patch
keystrokes.txt
```

`file-diff.patch` shows only the intended additions:

```diff
+$v=\frac{s}{t}$ continuing prose
+$$
+E=mc^2
+$$
```

The display workflow was captured in a focused Obsidian run:

```text
06-display-active.png
07-display-committed.png
```

That run placed the cursor on the blank line after `Display:`, ran `structured-math:insert-display-math-container`, edited `E=mc^2` in the in-document display field, exited right, and left clean display Markdown in the vault note.

The desktop-control fallback screenshots:

```text
01-vault-inline-empty.jpeg
02-vault-inline-typed.jpeg
03-vault-inline-prose.jpeg
```

These independently show the same local vault rendering through the Mac UI: the math field is embedded in the note body, typed math appears in the active field, and prose continues after boundary exit.

# D24 Evidence Note

I attempted a single continuous Obsidian/CDP evidence script multiple times. It consistently completed the inline create/edit/commit path and no-edit activation, but it lost reliable CodeMirror focus after Escape when moving to the next existing equation. Focused CDP runs and desktop-control screenshots were therefore used as the D24 fallback evidence bundle: screenshots, transcript, before/after Markdown, and a byte diff.

The automated browser suite remains the authoritative proof for Escape revert and undo granularity because those assertions exercise the actual extension, widget, MathLive engine, and CodeMirror history together without the Obsidian/CDP focus instability. I did not include the invalid synthetic Escape screenshots where injected `setValue` or misfocused keyboard input failed to represent real user editing.

# AGENT-DECIDED Notes

No new product-scope decisions were made in Phase 2. The only agent-level judgment was the D24 evidence split above: use automated browser acceptance tests for deterministic Escape/undo proof, and real vault screenshots plus file diffs for the visual in-document proof, because a single continuous Obsidian recording/script was blocked by external focus instability.

# Review Notes

Claude should inspect the CodeMirror state mapping, the widget `eq`/`updateDOM` path, and the stale-range guard closely. The most important files are `src/editor/active-state.ts`, `src/editor/math-widget.ts`, `src/editor/math-ranges.ts`, and `src/editor/extension.ts`.

The known limitation after Phase 2 is scope, not a hidden alternative editor: the Phase 2 path has no integrated `\` template palette yet. That is intentionally Phase 3. The Phase 2 implementation proves the in-document active editing surface, clean Markdown storage, byte-neutral no-edit activation in tests, display block editing, Escape revert in tests, and undo coalescing in tests.
