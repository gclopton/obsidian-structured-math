import { describe, expect, it } from "vitest";
import { structuredMathReadiness } from "../../src/release-readiness";

const untouched = { typed: false, composing: false, written: true, saved: true };

describe("release readiness", () => {
  it("lets an idle plugin reload", () => {
    expect(structuredMathReadiness({ drafts: [] })).toEqual({ canReload: true });
  });

  it("lets an untouched active equation reload, even while its note has other unsaved text", () => {
    expect(structuredMathReadiness({ drafts: [untouched] })).toEqual({ canReload: true });
    expect(structuredMathReadiness({ drafts: [{ ...untouched, saved: false }] })).toEqual({ canReload: true });
  });

  it("holds after the first keystroke until the note is saved", () => {
    const typed = { ...untouched, typed: true, saved: false };
    expect(structuredMathReadiness({ drafts: [typed] })).toEqual({
      canReload: false,
      reason: "A Structured Math equation edit is not saved yet",
    });
    expect(structuredMathReadiness({ drafts: [{ ...typed, written: false }] }).canReload).toBe(false);
    expect(structuredMathReadiness({ drafts: [{ ...typed, saved: true }] })).toEqual({ canReload: true });
  });

  it("holds while an IME composition is in progress", () => {
    expect(structuredMathReadiness({ drafts: [{ ...untouched, typed: true, composing: true }] })).toEqual({
      canReload: false,
      reason: "A Structured Math equation has text being composed",
    });
  });

  it("answers with the shape Vault Sync reads", () => {
    expect(Object.keys(structuredMathReadiness({ drafts: [] }))).toEqual(["canReload"]);
    expect(Object.keys(structuredMathReadiness({ drafts: [{ ...untouched, composing: true }] })).sort())
      .toEqual(["canReload", "reason"]);
  });
});
