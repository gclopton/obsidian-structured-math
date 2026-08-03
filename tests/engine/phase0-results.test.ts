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

interface D28Analysis {
  summary: {
    strictCountedPasses: number;
    proposedD28CountedPasses: number;
    proposedD28CountedFailures: number;
    mustPassAligned: boolean;
    mustPassCases: boolean;
    middleCompatibilityItems: number[];
  };
}

describe("Phase 0 MathLive spike results", () => {
  it("records the corrected strict D16 failure", () => {
    const results = JSON.parse(
      readFileSync("spikes/mathlive-fidelity/results.json", "utf8")
    ) as RoundTripResults;

    expect(results.summary.countedPasses).toBe(23);
    expect(results.summary.countedFailures).toBe(13);
    expect(results.summary.mustPassAligned).toBe(true);
    expect(results.summary.mustPassCases).toBe(true);
    expect(results.summary.decision).toBe("fail");
  });

  it("records the provisional D28 normalization result separately", () => {
    const results = JSON.parse(
      readFileSync("spikes/mathlive-fidelity/d28-analysis.json", "utf8")
    ) as D28Analysis;

    expect(results.summary.strictCountedPasses).toBe(23);
    expect(results.summary.proposedD28CountedPasses).toBe(36);
    expect(results.summary.proposedD28CountedFailures).toBe(0);
    expect(results.summary.mustPassAligned).toBe(true);
    expect(results.summary.mustPassCases).toBe(true);
    expect(results.summary.middleCompatibilityItems).toEqual([30, 33]);
  });

  it("passes the sampled natural-edit probe", () => {
    const results = JSON.parse(
      readFileSync("spikes/mathlive-fidelity/natural-results.json", "utf8")
    ) as NaturalResults;

    expect(results.summary.passes).toBe(7);
    expect(results.summary.failures).toBe(0);
  });
});
