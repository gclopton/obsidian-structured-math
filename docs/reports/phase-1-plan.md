# Phase 1 Plan

Source docs: Phase 1 in `05 Build Phases`, template rules in `03 Template System and Suggestion Box`, normative core catalog in `10 Core Template Catalog`, repo contracts in `07 Repo Conventions and Contracts`, and the Phase 0 report.

Checklist:

- Keep `MathLiveEngine` as the v1 engine after Phase 0 pass.
- Materialize `core/templates/core-catalog.json` from `10 Core Template Catalog`.
- Implement template loading, validation, alias/command extraction, and ranking.
- Implement palette state helpers for recents, frequency, and favorites, including empty-query recents-first ordering.
- Add the Formula Library converter against the pinned reference repo.
- Add a `MathLiveEngine` implementation behind `EditorEngine`.
- Add engine smoke tests in a real browser page: mount, insert fraction wrapping selection, and move to the denominator placeholder.
- Add a standalone palette component test page and keyboard tests.
- Keep `npm run test:all` green.
- Write `docs/reports/phase-1.md`, commit, and tag `phase-1`.
