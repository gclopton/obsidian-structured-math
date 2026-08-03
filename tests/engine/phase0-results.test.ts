import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

interface RoundTripResults {
  summary: {
    strictCountedPasses: number;
    strictCountedFailures: number;
    countedPasses: number;
    countedFailures: number;
    mustPassAligned: boolean;
    mustPassCases: boolean;
    fixupItems: number[];
    decision: "pass" | "conditional" | "fail";
  };
  items: Array<{
    id: number;
    serializerOutput: string;
    output: string;
    fixupsApplied: Array<{ id: string }>;
    d28Pass: boolean;
  }>;
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
    fixupItems: number[];
  };
}

describe("Phase 0 MathLive spike results", () => {
  it("uses true serialization as canonical results and passes under ratified D28", () => {
    const results = JSON.parse(
      readFileSync("spikes/mathlive-fidelity/results.json", "utf8")
    ) as RoundTripResults;

    expect(results.summary.strictCountedPasses).toBe(23);
    expect(results.summary.strictCountedFailures).toBe(13);
    expect(results.summary.countedPasses).toBe(36);
    expect(results.summary.countedFailures).toBe(0);
    expect(results.summary.mustPassAligned).toBe(true);
    expect(results.summary.mustPassCases).toBe(true);
    expect(results.summary.fixupItems).toEqual([30, 33]);
    expect(results.summary.decision).toBe("pass");
  });

  it("records D28 analysis from canonical fixed output", () => {
    const results = JSON.parse(
      readFileSync("spikes/mathlive-fidelity/d28-analysis.json", "utf8")
    ) as D28Analysis;

    expect(results.summary.strictCountedPasses).toBe(23);
    expect(results.summary.proposedD28CountedPasses).toBe(36);
    expect(results.summary.proposedD28CountedFailures).toBe(0);
    expect(results.summary.mustPassAligned).toBe(true);
    expect(results.summary.mustPassCases).toBe(true);
    expect(results.summary.fixupItems).toEqual([30, 33]);
  });

  it("fixes MathLive middle-delimiter output before classifying items 30 and 33", () => {
    const results = JSON.parse(
      readFileSync("spikes/mathlive-fidelity/results.json", "utf8")
    ) as RoundTripResults;

    for (const id of [30, 33]) {
      const item = results.items.find((candidate) => candidate.id === id);
      expect(item?.serializerOutput).toContain("\\middle{|}");
      expect(item?.output).toContain("\\middle|");
      expect(item?.output).not.toContain("\\middle{|}");
      expect(item?.fixupsApplied.map((fixup) => fixup.id)).toContain("middle-delimiter-brace");
      expect(item?.d28Pass).toBe(true);
    }
  });

  it("passes the sampled natural-edit probe", () => {
    const results = JSON.parse(
      readFileSync("spikes/mathlive-fidelity/natural-results.json", "utf8")
    ) as NaturalResults;

    expect(results.summary.passes).toBe(7);
    expect(results.summary.failures).toBe(0);
  });
});
