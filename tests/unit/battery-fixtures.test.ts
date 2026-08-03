import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const fixtureDir = path.resolve("tests/fixtures/battery");

describe("battery fixtures", () => {
  it("materializes every Spike A item as source and expected fixtures", () => {
    const files = readdirSync(fixtureDir);
    const sourceFiles = files.filter((file) => file.endsWith(".tex") && !file.endsWith(".expected.tex"));
    const expectedFiles = files.filter((file) => file.endsWith(".expected.tex"));

    expect(sourceFiles).toHaveLength(40);
    expect(expectedFiles).toHaveLength(40);

    for (const source of sourceFiles) {
      const expected = source.replace(/\.tex$/, ".expected.tex");
      expect(existsSync(path.join(fixtureDir, expected))).toBe(true);
      expect(readFileSync(path.join(fixtureDir, source), "utf8")).toMatch(/^tolerance: /);
    }
  });
});
