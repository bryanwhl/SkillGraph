import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fixturePath, repoRoot } from "./support/paths.js";

const execFileAsync = promisify(execFile);

describe("skillgraph CLI", () => {
  let cwd: string;

  beforeEach(async () => {
    cwd = await mkdtemp(path.join(tmpdir(), "skillgraph-cli-"));
  });

  afterEach(async () => {
    await rm(cwd, { recursive: true, force: true });
  });

  it("indexes, searches, resolves, expands, and explains end to end", async () => {
    const cli = path.join(repoRoot, "src", "cli", "index.ts");
    const tsx = path.join(repoRoot, "node_modules", "tsx", "dist", "cli.mjs");
    const commonArgs = [
      cli,
      "--cwd",
      cwd,
      "--skill-root",
      fixturePath("skills"),
      "--graph",
      fixturePath("skillgraph.yaml"),
    ];

    const indexResult = await execFileAsync(process.execPath, [tsx, ...commonArgs, "index"]);
    expect(indexResult.stdout).toContain("Indexed 6 nodes");

    const searchResult = await execFileAsync(process.execPath, [
      tsx,
      ...commonArgs,
      "search",
      "frontend polish",
      "--format",
      "json",
    ]);
    const searchJson = JSON.parse(searchResult.stdout);
    expect(searchJson.results[0].node.id).toBe("frontend-design");

    const resolveResult = await execFileAsync(process.execPath, [
      tsx,
      ...commonArgs,
      "resolve",
      "Make this frontend dashboard production-ready",
      "--format",
      "json",
      "--budget",
      "1600",
    ]);
    const resolutionJson = JSON.parse(resolveResult.stdout);
    expect(resolutionJson.selected.map((item: { node: string }) => item.node))
      .toContain("frontend-design");

    const expandResult = await execFileAsync(process.execPath, [
      tsx,
      ...commonArgs,
      "expand",
      "frontend-design",
      "--depth",
      "full",
    ]);
    expect(expandResult.stdout).toContain("# Frontend Design");

    const explainResult = await execFileAsync(process.execPath, [
      tsx,
      ...commonArgs,
      "explain",
      "--last",
    ]);
    expect(explainResult.stdout).toContain("## Selected");
    expect(explainResult.stdout).toContain("frontend-design");
  });
});
