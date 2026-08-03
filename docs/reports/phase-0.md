# Phase 0 Report — MathLive Spike

Date: 2026-08-03

Decision: **pass under ratified D28 — use `MathLiveEngine` for v1.**

Claude's Checkpoint 1 review invalidated the first report because the harness measured MathLive's verbatim `getValue("latex")` cache after `setValue()`. This report replaces that record. The canonical Phase 0 result now uses true serialization from `getValue("latex-expanded")`, applies explicit sync-layer fixups, and classifies output under ratified D28.

# Commands

```bash
npm run spike:mathlive
npm run spike:natural
npm run spike:d28-analysis
npm run test:all
```

# Canonical Round-Trip Result

`spikes/mathlive-fidelity/results.json` is the canonical result file.

```text
Wrote spikes/mathlive-fidelity/results.json
{
  "strictCountedPasses": 23,
  "strictCountedFailures": 13,
  "countedPasses": 36,
  "countedFailures": 0,
  "mustPassAligned": true,
  "mustPassCases": true,
  "fixupItems": [
    30,
    33
  ],
  "decision": "pass"
}
```

Interpretation:

- Original strict D16: 23/36 counted passes, 13 counted failures.
- Ratified D28: 36/36 counted passes.
- Required multiline items passed: `aligned` #22 and `cases` #25.
- Items 30 and 33 emitted MathLive's nonstandard `\middle{|}` form and were counted only after the explicit `middle-delimiter-brace` fixup rewrote that output to standard `\middle|`.
- Cached `getValue("latex")` is recorded per item only as BS-37 evidence; it is not used for serializer pass/fail.

# Failure List Under Original Strict D16

The 13 strict failures were items 2, 5, 7, 8, 11, 12, 15, 20, 21, 23, 28, 30, and 33. They are whole-equation serializer normalizations: spacing removal, brace normalization, compact `\tfrac` forms, prime normalization, `\mathrm` argument/subscript restructuring, matrix spacing normalization, and the `\middle{|}` issue fixed above.

# Natural-Edit Result

`spikes/mathlive-fidelity/natural-results.json` records the amended Phase 0 natural-edit evidence.

```text
Wrote spikes/mathlive-fidelity/natural-results.json
{
  "passes": 7,
  "failures": 0
}
```

The sampled items were 9, 12, 20, 22, 25, 28, and 29. The automated substitute criterion is documented in `docs/decisions/AGENT-DECIDED-20260803-natural-edit-automation.md`: insert exactly one token, remove it, require D28-equivalence to the original, and for multiline must-pass items add a placeholder row.

# D28 Analysis

`spikes/mathlive-fidelity/d28-analysis.json` cross-checks the canonical result.

```text
Wrote spikes/mathlive-fidelity/d28-analysis.json
{
  "strictCountedPasses": 23,
  "proposedD28CountedPasses": 36,
  "proposedD28CountedFailures": 0,
  "mustPassAligned": true,
  "mustPassCases": true,
  "fixupItems": [
    30,
    33
  ]
}
```

# Test Output

```text
npm run test:all

lint: passed
unit: 2 files passed, 7 tests passed
engine: 1 file passed, 4 tests passed
```

# AGENT-DECIDED Notes

- `docs/decisions/AGENT-DECIDED-20260803-invalidate-cache-run.md`
- `docs/decisions/AGENT-DECIDED-20260803-natural-edit-automation.md`

# Next

Phase 0 is complete under ratified D28. Proceed to Phase 1 with `MathLiveEngine`.
