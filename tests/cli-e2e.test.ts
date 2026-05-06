import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fixturePath, repoRoot } from "./support/paths.js";

const execFileAsync = promisify(execFile);

describe("skill-graph CLI", () => {
  let cwd: string;

  beforeEach(async () => {
    cwd = await mkdtemp(path.join(tmpdir(), "skill-graph-cli-"));
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
      fixturePath("skill-graph.yaml"),
    ];

    const indexResult = await execFileAsync(process.execPath, [tsx, ...commonArgs, "index"]);
    expect(indexResult.stdout).toContain("Indexed 6 nodes");

    const embeddingIndexResult = await execFileAsync(process.execPath, [
      tsx,
      ...commonArgs,
      "embeddings",
      "index",
      "--provider",
      "deterministic",
      "--format",
      "json",
    ]);
    const embeddingIndexJson = JSON.parse(embeddingIndexResult.stdout);
    expect(embeddingIndexJson.provider).toBe("deterministic");
    expect(embeddingIndexJson.vectors).toHaveLength(6);

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
    expect(searchJson.results[0].provider).toBe("bm25");

    const lexicalSearchResult = await execFileAsync(process.execPath, [
      tsx,
      ...commonArgs,
      "search",
      "frontend polish",
      "--strategy",
      "lexical",
      "--format",
      "json",
    ]);
    const lexicalSearchJson = JSON.parse(lexicalSearchResult.stdout);
    expect(lexicalSearchJson.results[0].provider).toBe("lexical");

    const hybridSearchResult = await execFileAsync(process.execPath, [
      tsx,
      ...commonArgs,
      "search",
      "frontend polish",
      "--strategy",
      "hybrid",
      "--format",
      "json",
    ]);
    const hybridSearchJson = JSON.parse(hybridSearchResult.stdout);
    expect(hybridSearchJson.results[0].provider).toBe("hybrid");
    expect(hybridSearchJson.results[0].sourceProviders).toContain("semantic");

    const semanticSearchResult = await execFileAsync(process.execPath, [
      tsx,
      ...commonArgs,
      "search",
      "visual screenshot review",
      "--strategy",
      "semantic",
      "--format",
      "json",
    ]);
    const semanticSearchJson = JSON.parse(semanticSearchResult.stdout);
    expect(semanticSearchJson.results[0].node.id).toBe("visual-qa");
    expect(semanticSearchJson.results[0].provider).toBe("semantic");

    const edgeSuggestionResult = await execFileAsync(process.execPath, [
      tsx,
      ...commonArgs,
      "edges",
      "suggest",
      "--format",
      "json",
      "--limit",
      "2",
      "--min-confidence",
      "0.05",
    ]);
    const edgeSuggestionJson = JSON.parse(edgeSuggestionResult.stdout);
    expect(edgeSuggestionJson.suggestions).toHaveLength(2);
    expect(edgeSuggestionJson.suggestions[0].reviewStatus).toBe("proposed");

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

    const contextResult = await execFileAsync(process.execPath, [
      tsx,
      ...commonArgs,
      "context",
      "--format",
      "json",
    ]);
    const contextJson = JSON.parse(contextResult.stdout);
    expect(contextJson.loaded).toContainEqual(
      expect.objectContaining({
        node: "frontend-design",
        depth: "l3",
      }),
    );

    const explainResult = await execFileAsync(process.execPath, [
      tsx,
      ...commonArgs,
      "explain",
      "--last",
    ]);
    expect(explainResult.stdout).toContain("## Selected");
    expect(explainResult.stdout).toContain("frontend-design");

    const cachedRemoteResult = await execFileAsync(process.execPath, [
      tsx,
      cli,
      "--cwd",
      cwd,
      "remote-cache",
      "accessibility keyboard",
      "--fixture",
      fixturePath("skills-sh-find-output.txt"),
      "--format",
      "json",
    ]);
    const cachedRemoteJson = JSON.parse(cachedRemoteResult.stdout);
    expect(cachedRemoteJson.results[0].name).toBe("accessibility-review");

    const installResult = await execFileAsync(process.execPath, [
      tsx,
      ...commonArgs,
      "install",
      "remote-deployment",
    ]);
    expect(installResult.stdout).toContain(
      "npx skills add example/deployment-skills --skill remote-deployment",
    );
    expect(installResult.stdout).toContain("approval required");
  });
});
