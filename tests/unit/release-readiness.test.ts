import { describe, expect, it } from "vitest";
import { structuredMathReadiness } from "../../src/release-readiness";

describe("release readiness", () => {
  it("lets an idle plugin reload", () => {
    expect(structuredMathReadiness({ activeEquations: 0 })).toEqual({ canReload: true });
  });

  it("holds the reload while an equation is being edited", () => {
    expect(structuredMathReadiness({ activeEquations: 1 })).toEqual({
      canReload: false,
      reason: "A Structured Math equation is being edited",
    });
  });

  it("is ready again after the equation is left", () => {
    expect(structuredMathReadiness({ activeEquations: 2 }).canReload).toBe(false);
    expect(structuredMathReadiness({ activeEquations: 0 })).toEqual({ canReload: true });
  });

  it("answers with the shape Vault Sync reads", () => {
    expect(Object.keys(structuredMathReadiness({ activeEquations: 0 }))).toEqual(["canReload"]);
    expect(Object.keys(structuredMathReadiness({ activeEquations: 1 })).sort()).toEqual(["canReload", "reason"]);
  });
});
