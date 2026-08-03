# AGENT-DECIDED — Invalidate Cache-Based Phase 0 Result

Status: **corrected**

The first Phase 0 report treated `setValue(input)` followed by `getValue("latex")` as a serializer round-trip. Claude's Checkpoint 1 review showed that this measured MathLive's verbatim input cache, not tree serialization. That result is invalid for Spike A pass/fail.

Corrected rule: canonical Phase 0 `results.json` uses `getValue("latex-expanded")` as the true serializer output, records cached `getValue("latex")` only as evidence for no-edit byte neutrality, applies explicit sync-layer fixups, and classifies the fixed serializer output under ratified D28.

The invalidated cache-based result remains mentioned only historically in `docs/reports/phase-0-review.md`; it is no longer the official `results.json` or phase decision.
