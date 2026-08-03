# D28 — Post-Edit Serialization Policy

Status: **PROPOSED — awaiting Sam ratification**

Claude's Checkpoint 1 review showed that `setValue()` followed by `getValue("latex")` measures MathLive's verbatim input cache, not serializer fidelity. The corrected harness uses `getValue("latex-expanded")` and shows the real product question: after any structural edit, MathLive normalizes the edited equation's entire serialization.

Proposed rule: v1 accepts engine-normalized serialization for equations the user actually edits, provided the normalization preserves rendered mathematical meaning and remains valid LaTeX. Unedited equations remain byte-identical through the activation-time cache/guard. The plugin still never rewrites math it did not activate.

Proposed D16 extension for edited equations only:

- whitespace insertion/removal
- `\left`/`\right` insertion/removal around paired delimiters
- braces added/removed around single-character subscript/superscript arguments
- braces added/removed around single-command subscript/superscript arguments such as `_{\infty}` to `_\infty`
- compact fraction arguments such as `\tfrac{1}{2}` to `\tfrac12`
- single-token radical compaction such as `\sqrt{3}` to `\sqrt3`
- prime normalization such as `r'` to `r^{\prime}`, including primes on grouped command expressions such as `\mathbf{r}^{\prime}`
- `\mathrm` argument/subscript restructuring when token order and rendered meaning are unchanged
- single-token grouping after commands such as `\longrightarrow{E}`

Compatibility concern: MathLive rewrites `\middle|` to `\middle{|}` in items 30 and 33. That needs an external compatibility check before it is accepted as harmless. Until then, D28 should either exclude those items or classify them as raw/known-hostile behavior.

If Sam rejects this policy, MathLive cannot pass the original "only that token changed in serialization" requirement, and D21 requires Spike B/custom or hybrid exploration.
