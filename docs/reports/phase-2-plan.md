# Phase 2 Plan — In-Document Editing MVP

Date: 2026-08-03

# Objective

Implement the first real Obsidian editor integration: active inline and display equations are edited in place inside the note through a CodeMirror replace-decoration widget hosting `MathLiveEngine`. This phase must prove D26, BS-37, and D28 in the actual `latex` vault before Checkpoint 2 review.

# Checklist

- [x] Add a syntax-tree math scanner for inline `$...$` and display `$$...$$` ranges, with a conservative text fallback for test harnesses.
- [x] Add an active math `StateField` and effects for activation, deactivation, MathLive-to-document sync, and Escape revert.
- [x] Add an in-place `WidgetType` that mounts `MathLiveEngine` at the active document range and never uses `Modal`.
- [x] Add keyboard entry: `$` creates an empty inline field at the text cursor; the display-container command creates a display block and leaves the cursor inside it.
- [x] Add boundary behavior: arrow entry/reactivation, arrow exits, Tab exits at the outermost/right boundary, and Escape reverts to activation-time source.
- [x] Preserve bytes for activation/deactivation without edits and apply D28 serializer fixups only after real MathLive edits.
- [x] Add automated browser coverage for the Phase 2 editor path, including inline creation, display editing, no-edit byte neutrality, Escape revert, and undo granularity.
- [x] Build into `/Users/gradyclopton/ObsidianVaults/latex/.obsidian/plugins/structured-math/`.
- [x] Produce D24 evidence from the `latex` vault or, if app recording/control is blocked, a fallback evidence bundle with screenshots/transcript/file-byte diff.
- [x] Write `docs/reports/phase-2.md`.

# Review Risks

Claude should pay special attention to range mapping while the active widget updates hidden Markdown, whether unedited activation is byte-neutral, whether any raw LaTeX outside the active range can be rewritten, and whether the implementation accidentally creates a modal/editor-pane workflow.
