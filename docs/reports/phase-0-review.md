# Checkpoint 1 Review — Claude, 2026-08-03

**Verdict: checkpoint 1 is NOT passed on the current evidence.** The engine choice (MathLive) is probably still correct, and nothing here triggers Spike B or the D21 fallback — but the round-trip results do not measure what the spike exists to measure, so the "pass" is unsupported. Remediation R1–R3 below re-earns it. Per the checkpoint doc, this does not block unrelated Phase 1 work.

## F1 (critical) — the round-trip harness measured MathLive's verbatim cache, not its serializer

All 40 items came back byte-identical, and the report concluded "no cosmetic whitelist was needed." That result is an artifact. MathLive caches the LaTeX string passed to `setValue()` and returns it verbatim from `getValue()` until the content is edited. Independently reproduced on `mathlive@0.110.0` (headless Chromium):

- `getValue()` after `setValue()`: **identical to input on every probe** — including after an edit+undo cycle (undo restores the cache).
- `getValue("latex-expanded")` — serialization from the actual atom tree — differs on every probe:
  - item 20: whitespace stripped (`x=\frac{-b\pm\sqrt{b^2-4ac}}{2a}`) — item 20's tolerance is `identical`, so under true serialization it **fails its own tolerance**
  - item 2: `\mathrm{O_O}` → `\mathrm{O}_{O}`, `\tfrac{1}{2}` → `\tfrac12`, `2e^-` → `2e^{-}`
  - item 30: `\middle|` → `\middle{|}` (nonstandard LaTeX — flag for external-compatibility check)
  - item 22: spacing/alignment-marker rewrites, structure intact

The spike's own `natural-results.json` corroborates this: the moment the probe actually edited item 9, serialization returned `E_{U}=\frac{U_{\mathrm{effz}}}{2}…` — brace normalization and spacing collapse everywhere, plus `'` → `^{\prime}` on item 12. The same serializer cannot produce those diffs after an edit and 40/40 byte-identical without one; the byte-identical numbers are the cache talking.

The report's "no cosmetic whitelist was needed" should have been treated as a red flag, not a success line: it is a highly surprising claim that went uninvestigated.

## F2 (major) — undocumented deviation from the spike procedure

Doc 11's edit-naturally criterion is "change one token … verify **only that token changed** in the serialization." The automated probe substituted the far weaker "serialization changed and is nonempty." The manual checklist was left unfilled, no screen recording or D24 fallback evidence exists for the manual checks, and the report says "AGENT-DECIDED notes: none" despite two real deviations (automation substituted for manual; criterion weakened). Working agreements: requirements are never weakened silently; deviations get notes.

## F3 (product-level, needs Sam) — post-edit serialization rewrites the whole equation

True MathLive serialization normalizes the entire expression on any edit (braces, spacing, `\tfrac12`, `^{\prime}`, `\mathrm` argument restructuring). Consequences: (a) doc 11's only-token-changed criterion is unsatisfiable with MathLive as-is; (b) editing one token of an equation will rewrite that equation's formatting in the note (BS-37 still fully protects *unedited* equations — helpfully, the verbatim cache makes no-edit byte-neutrality free, which should be recorded in doc 02's sync design as an asset). This needs an explicit decision, not silent acceptance: **proposed D28** — accept engine-normalized serialization for edited equations, and extend the D16 cosmetic whitelist with the enumerated observed normalizations (whitespace, brace add/remove around single tokens, `\tfrac{1}{2}`↔`\tfrac12`, `'`↔`^{\prime}`, `\mathrm` argument restructuring where rendering is identical). Sam ratifies; the pass rule then recomputes against the amended whitelist.

## F4 — what checks out

Battery fixtures complete (40 `.tex`/`.expected.tex` pairs) and consistent with doc 11 on spot-checks; `mustPass` flags correct (22, 25); counted-set logic (ids 1–36) consistent with D17; `mathlive@0.110.0` pinned exactly; repo structure per doc 07; phase-0-plan written before code. And one genuinely encouraging technical result: `aligned` and `cases` survived parsing, navigation, and `addRowAfter` with structure intact — the historically weak area held, which is why the engine choice likely survives honest measurement.

## Remediation to pass checkpoint 1

- **R1** Re-run the round-trip forcing true serialization (`getValue("latex-expanded")`, or an edit-perturbation protocol), reclassify per current D16, and report the real diff classes — including the failures that will appear.
- **R2** File the D28 decision note (post-edit serialization policy + enumerated D16 whitelist extension) for Sam's ratification; recompute pass/fail under the ratified whitelist.
- **R3** Redo the seven doc-11 checks against the criterion as amended by D28, with D24-compliant evidence — or an AGENT-DECIDED note stating the automated substitution and its exact criterion.
- **R4** (non-blocking) Record the verbatim-cache behavior in doc 02 as the mechanism backing BS-37, with the caveat that it must never be mistaken for serializer fidelity again.
