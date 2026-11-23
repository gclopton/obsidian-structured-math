// Vault Sync updates this plugin in place only after getReleaseReadiness()
// returns { canReload: true }. Any other answer holds the reload and its
// reason is shown to the user.
export type ReleaseReadiness =
  | { canReload: true }
  | { canReload: false; reason: string };

/** One active structured equation. Every value the field produces is written into the note buffer. */
export interface EquationDraft {
  /** The user changed the field's value during this session. */
  typed: boolean;
  /** An IME composition is in progress; its text exists only in the field. */
  composing: boolean;
  /** The field's current value is in the note buffer. */
  written: boolean;
  /** The note buffer equals the note on disk. */
  saved: boolean;
}

export interface StructuredMathWork {
  drafts: EquationDraft[];
}

export function structuredMathReadiness(work: StructuredMathWork): ReleaseReadiness {
  if (work.drafts.some((draft) => draft.composing)) {
    return { canReload: false, reason: "A Structured Math equation has text being composed" };
  }
  if (work.drafts.some((draft) => draft.typed && !(draft.written && draft.saved))) {
    return { canReload: false, reason: "A Structured Math equation edit is not saved yet" };
  }
  return { canReload: true };
}
