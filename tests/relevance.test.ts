import { describe, expect, it } from "vitest";
import { indexSkills } from "../src/graph/builder.js";
import { resolveTask } from "../src/resolver/plan.js";
import { searchSkills } from "../src/resolver/retrieve.js";
import { fixturePath } from "./support/paths.js";

async function relevanceGraph() {
  return indexSkills({
    cwd: fixturePath(),
    skillRoots: [fixturePath("skills")],
    graphFiles: [fixturePath("skillgraph.yaml")],
    now: "2026-05-06T00:00:00.000Z",
  });
}

describe("retrieval relevance", () => {
  it.each([
    ["frontend polish production ui", "frontend-design"],
    ["visual regression screenshots", "visual-qa"],
    ["typescript generics discriminated unions", "typescript-advanced-types"],
    ["deploy hosted production application", "remote-deployment"],
  ])("ranks %s with the expected top BM25 skill", async (query, expectedTop) => {
    const graph = await relevanceGraph();

    const results = searchSkills(graph, query, { provider: "bm25", limit: 3 });

    expect(results[0]?.node.id).toBe(expectedTop);
    expect(results[0]?.provider).toBe("bm25");
  });

  it("keeps resolver graph expansion stable when BM25 supplies candidates", async () => {
    const graph = await relevanceGraph();

    const resolution = resolveTask(graph, {
      task: "Make this frontend dashboard polished and production-ready",
      agent: "codex",
      budgetTokens: 1600,
    });

    expect(resolution.selected.map((item) => item.node)).toEqual([
      "web-development",
      "frontend",
      "frontend-design",
    ]);
    expect(resolution.selected.find((item) => item.node === "frontend-design"))
      .toMatchObject({
        scoreProvider: "bm25",
      });
  });
});
