// Vault Sync updates this plugin in place only after getReleaseReadiness()
// returns { canReload: true }. Any other answer holds the reload and its
// reason is shown to the user.
export type ReleaseReadiness =
  | { canReload: true }
  | { canReload: false; reason: string };

export interface StructuredMathWork {
  /** Editors with an open structured equation (a live MathLive field in the note). */
  activeEquations: number;
}

export function structuredMathReadiness(work: StructuredMathWork): ReleaseReadiness {
  if (work.activeEquations > 0) {
    return { canReload: false, reason: "A Structured Math equation is being edited" };
  }
  return { canReload: true };
}
