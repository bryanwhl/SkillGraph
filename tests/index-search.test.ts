import { describe, expect, it } from "vitest";
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
      "typescript-advanced-types",
      "visual-qa",
      "web-development",
    ]);
    expect(graph.edges).toHaveLength(4);
  });

  it("ranks direct lexical matches ahead of adjacent skills", async () => {
    const graph = await indexSkills({
      cwd: fixturePath(),
      skillRoots: [fixturePath("skills")],
      graphFiles: [fixturePath("skillgraph.yaml")],
      now: "2026-05-06T00:00:00.000Z",
    });

    const results = searchSkills(graph, "frontend polish production ui");

    expect(results[0]?.node.id).toBe("frontend-design");
    expect(results[0]?.score).toBeGreaterThan(results[1]?.score ?? 0);
    expect(results[0]?.reason).toContain("frontend");
  });
});
