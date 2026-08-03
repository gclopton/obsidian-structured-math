import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

interface RoundTripResults {
  summary: {
    countedPasses: number;
    countedFailures: number;
    mustPassAligned: boolean;
    mustPassCases: boolean;
    decision: "pass" | "conditional" | "fail";
  };
}

interface NaturalResults {
  summary: {
    passes: number;
    failures: number;
  };
}

describe("Phase 0 MathLive spike results", () => {
  it("passes the mechanical round-trip gate", () => {
    const results = JSON.parse(
      readFileSync("spikes/mathlive-fidelity/results.json", "utf8")
    ) as RoundTripResults;

    expect(results.summary.countedPasses).toBe(36);
    expect(results.summary.countedFailures).toBe(0);
    expect(results.summary.mustPassAligned).toBe(true);
    expect(results.summary.mustPassCases).toBe(true);
    expect(results.summary.decision).toBe("pass");
  });

  it("passes the sampled natural-edit probe", () => {
    const results = JSON.parse(
      readFileSync("spikes/mathlive-fidelity/natural-results.json", "utf8")
    ) as NaturalResults;

    expect(results.summary.passes).toBe(7);
    expect(results.summary.failures).toBe(0);
  });
});
