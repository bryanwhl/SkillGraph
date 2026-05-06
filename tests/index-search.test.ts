import { describe, expect, it } from "vitest";
import { skillsShResultToNode } from "../src/adapters/skills-sh.js";
import { indexSkills } from "../src/graph/builder.js";
import { searchSkills } from "../src/resolver/retrieve.js";
import { fixturePath } from "./support/paths.js";

describe("indexSkills and searchSkills", () => {
  it("indexes local skill roots and merges manual graph nodes and edges", async () => {
    const graph = await indexSkills({
      cwd: fixturePath(),
      skillRoots: [fixturePath("skills")],
      graphFiles: [fixturePath("skillgraph.yaml")],
      now: "2026-05-06T00:00:00.000Z",
    });

    expect(graph.nodes.map((node) => node.id).sort()).toEqual([
      "frontend",
      "frontend-design",
      "remote-deployment",
      "typescript-advanced-types",
      "visual-qa",
      "web-development",
    ]);
    expect(graph.edges).toHaveLength(4);
  });

  it("merges remote skills.sh candidates into the graph index", async () => {
    const remoteNode = skillsShResultToNode(
      {
        id: "accessibility-review",
        name: "accessibility-review",
        repository: "example/frontend-skills",
        locator: "example/frontend-skills@accessibility-review",
        url: "https://skills.sh/example/frontend-skills/accessibility-review",
        installCount: 1200,
        installCommand:
          "npx skills add example/frontend-skills --skill accessibility-review",
      },
      {
        indexedAt: "2026-05-06T00:00:00.000Z",
        query: "accessibility keyboard",
      },
    );

    const graph = await indexSkills({
      cwd: fixturePath(),
      skillRoots: [fixturePath("skills")],
      graphFiles: [fixturePath("skillgraph.yaml")],
      remoteNodes: [remoteNode],
      now: "2026-05-06T00:00:00.000Z",
    });

    const results = searchSkills(graph, "accessibility keyboard", {
      provider: "bm25",
    });

    expect(results[0]?.node.id).toBe("accessibility-review");
    expect(results[0]?.node.status.installed).toBe(false);
  });

  it("ranks direct lexical matches ahead of adjacent skills", async () => {
    const graph = await indexSkills({
      cwd: fixturePath(),
      skillRoots: [fixturePath("skills")],
      graphFiles: [fixturePath("skillgraph.yaml")],
      now: "2026-05-06T00:00:00.000Z",
    });

    const results = searchSkills(graph, "frontend polish production ui", {
      provider: "lexical",
    });

    expect(results[0]?.node.id).toBe("frontend-design");
    expect(results[0]?.score).toBeGreaterThan(results[1]?.score ?? 0);
    expect(results[0]?.reason).toContain("frontend");
    expect(results[0]?.provider).toBe("lexical");
  });

  it("uses BM25 search by default with field-level match explanations", async () => {
    const graph = await indexSkills({
      cwd: fixturePath(),
      skillRoots: [fixturePath("skills")],
      graphFiles: [fixturePath("skillgraph.yaml")],
      now: "2026-05-06T00:00:00.000Z",
    });

    const results = searchSkills(graph, "visual regression screenshots");

    expect(results[0]?.node.id).toBe("visual-qa");
    expect(results[0]?.provider).toBe("bm25");
    expect(results[0]?.matchedFields).toEqual(
      expect.arrayContaining(["description", "tags"]),
    );
    expect(results[0]?.reason).toContain("BM25");
  });

  it("can fuse BM25 and lexical rankings with a hybrid provider", async () => {
    const graph = await indexSkills({
      cwd: fixturePath(),
      skillRoots: [fixturePath("skills")],
      graphFiles: [fixturePath("skillgraph.yaml")],
      now: "2026-05-06T00:00:00.000Z",
    });

    const results = searchSkills(graph, "frontend polish production ui", {
      provider: "hybrid",
      limit: 3,
    });

    expect(results[0]?.node.id).toBe("frontend-design");
    expect(results[0]?.provider).toBe("hybrid");
    expect(results[0]?.sourceProviders).toEqual(["bm25", "lexical"]);
    expect(results[0]?.reason).toContain("reciprocal rank fusion");
  });

  it("does not return installed skills that have no lexical match", async () => {
    const graph = await indexSkills({
      cwd: fixturePath(),
      skillRoots: [fixturePath("skills")],
      graphFiles: [fixturePath("skillgraph.yaml")],
      now: "2026-05-06T00:00:00.000Z",
    });

    const results = searchSkills(graph, "postgres database migration", {
      provider: "lexical",
    });

    expect(results).toEqual([]);
  });

  it("ignores stop words when scoring matches", async () => {
    const graph = await indexSkills({
      cwd: fixturePath(),
      skillRoots: [fixturePath("skills")],
      graphFiles: [fixturePath("skillgraph.yaml")],
      now: "2026-05-06T00:00:00.000Z",
    });

    const results = searchSkills(graph, "the and for with", {
      provider: "lexical",
    });

    expect(results).toEqual([]);
  });

  it("normalizes common suffixes and hyphenated terms for task wording", async () => {
    const graph = await indexSkills({
      cwd: fixturePath(),
      skillRoots: [fixturePath("skills")],
      graphFiles: [fixturePath("skillgraph.yaml")],
      now: "2026-05-06T00:00:00.000Z",
    });

    const results = searchSkills(graph, "production-ready polished dashboard", {
      provider: "lexical",
    });

    expect(results[0]?.node.id).toBe("frontend-design");
    expect(results[0]?.reason).toContain("polish");
  });
});
