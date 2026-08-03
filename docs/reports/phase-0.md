# Phase 0 Report — MathLive Spike

Date: 2026-08-03

Status correction after checkpoint review: **the original pass claim is invalidated.** See `docs/reports/phase-0-review.md` and `docs/reports/phase-0-remediation.md`.

Original decision recorded here: pass — use `MathLiveEngine` for v1. This decision is now provisional pending D28 ratification or an alternate engine route.

Spike A used the pinned `mathlive@0.110.0` dependency. The original automated round-trip harness loaded all 40 battery expressions into a real browser `<math-field>`, called `setValue(latex)`, waited for MathLive to settle, then read `getValue("latex")`.

Checkpoint review found that this measured MathLive's verbatim input cache, not true tree serialization. This report is retained as historical evidence of the mistake; it is not a valid checkpoint pass report.

Round-trip command:

```bash
npm run spike:mathlive
```

Output:

```text
Wrote spikes/mathlive-fidelity/results.json
{
  "countedPasses": 36,
  "countedFailures": 0,
  "mustPassAligned": true,
  "mustPassCases": true,
  "decision": "pass"
}
```

Result details:

- Counted items 1-36: 36 pass, 0 fail.
- Must-pass `aligned` item 22: pass.
- Must-pass `cases` item 25: pass.
- Known-hostile items 37-40: preserved without destructive diff.
- Every item came back byte-identical in this installed MathLive build; no cosmetic whitelist was needed.

Natural-edit probe command:

```bash
npm run spike:natural
```

Output:

```text
Wrote spikes/mathlive-fidelity/natural-results.json
{
  "passes": 7,
  "failures": 0
}
```

The natural-edit probe exercised sampled items 9, 12, 20, 22, 25, 28, and 29. For each item it focused the mathfield, moved from the mathfield start using MathLive movement commands, inserted a token, and verified serialization changed while remaining nonempty. For the multiline must-pass items 22 and 25, it also ran `addRowAfter` and verified serialization changed. This is automated evidence of structural navigation/editability, not a replacement for Sam's later hands-on Phase 2/3 UX checks.

Artifacts committed with this report:

- `spikes/mathlive-fidelity/battery.json`
- `spikes/mathlive-fidelity/results.json`
- `spikes/mathlive-fidelity/natural-results.json`
- `spikes/mathlive-fidelity/index.html`
- `spikes/mathlive-fidelity/browser-entry.ts`
- `spikes/mathlive-fidelity/run-roundtrip.mjs`
- `spikes/mathlive-fidelity/run-natural-checks.mjs`
- `spikes/mathlive-fidelity/manual-checklist.md`
- `tests/fixtures/battery/*.tex`
- `tests/fixtures/battery/*.expected.tex`

AGENT-DECIDED notes made during this phase: none.

Next: proceed to Phase 1 with `MathLiveEngine`.
