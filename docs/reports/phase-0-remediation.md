# Phase 0 Remediation After Checkpoint Review

Date: 2026-08-03

Claude's review in `docs/reports/phase-0-review.md` is accepted as valid. The original Phase 0 report overstated the result because the round-trip harness measured MathLive's cached `getValue("latex")` output after `setValue()`. That cache is useful for no-edit byte neutrality, but it is not serializer fidelity.

Remediation performed:

- `spikes/mathlive-fidelity/run-roundtrip.mjs` now records cached `getValue("latex")` separately and classifies `getValue("latex-expanded")`.
- `spikes/mathlive-fidelity/run-natural-checks.mjs` now records post-edit `getValue("latex-expanded")`.
- `spikes/mathlive-fidelity/analyze-d28.mjs` computes a provisional D28 normalization analysis.
- `docs/decisions/D28-post-edit-serialization-policy.md` records the required product decision.

Corrected strict D16 command:

```bash
npm run spike:mathlive
```

Output:

```text
Wrote spikes/mathlive-fidelity/results.json
{
  "countedPasses": 23,
  "countedFailures": 13,
  "mustPassAligned": true,
  "mustPassCases": true,
  "decision": "fail"
}
```

Natural-edit command:

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

Interpretation: MathLive preserves structural editability for the sampled expressions, including `aligned` and `cases` row insertion, but it normalizes the whole edited expression.

Provisional D28 analysis command:

```bash
npm run spike:d28-analysis
```

Output:

```text
Wrote spikes/mathlive-fidelity/d28-analysis.json
{
  "strictCountedPasses": 23,
  "proposedD28CountedPasses": 36,
  "proposedD28CountedFailures": 0,
  "mustPassAligned": true,
  "mustPassCases": true,
  "middleCompatibilityItems": [
    30,
    33
  ]
}
```

Interpretation under proposed D28: all counted failures are explained by whole-equation serializer normalization. The two `\middle|` rewrites are flagged for compatibility review, but they are not counted failures under the provisional normalization analysis.

Checkpoint status: **not passed yet**. It can pass only after Sam ratifies D28 or after an alternate engine route satisfies the original byte-level post-edit requirement.
