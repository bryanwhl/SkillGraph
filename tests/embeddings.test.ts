import { describe, expect, it } from "vitest";
import { indexSkills } from "../src/graph/builder.js";
import {
  buildEmbeddingIndex,
  createDeterministicEmbeddingProvider,
  embeddingIndexFreshness,
  searchSemanticSkills,
} from "../src/embeddings/indexer.js";
import { fixturePath } from "./support/paths.js";

async function graphWithFixtures() {
  return indexSkills({
    cwd: fixturePath(),
    skillRoots: [fixturePath("skills")],
    graphFiles: [fixturePath("skill-graph.yaml")],
    now: "2026-05-06T00:00:00.000Z",
  });
}

describe("semantic embeddings", () => {
  it("builds a deterministic embedding index for graph nodes", async () => {
    const graph = await graphWithFixtures();
    const provider = createDeterministicEmbeddingProvider({ dimensions: 32 });

    const index = await buildEmbeddingIndex(graph, {
      provider,
      model: "deterministic-test",
      indexedAt: "2026-05-06T00:00:00.000Z",
    });

    expect(index).toMatchObject({
      version: 1,
      provider: "deterministic",
      model: "deterministic-test",
      dimensions: 32,
    });
    expect(index.vectors).toHaveLength(graph.nodes.length);
    expect(index.vectors[0]?.vector).toHaveLength(32);
  });

  it("ranks skills by vector similarity with semantic provenance", async () => {
    const graph = await graphWithFixtures();
    const provider = createDeterministicEmbeddingProvider({ dimensions: 32 });
    const index = await buildEmbeddingIndex(graph, {
      provider,
      model: "deterministic-test",
      indexedAt: "2026-05-06T00:00:00.000Z",
    });
    const queryVector = await provider.embedQuery("visual screenshot review");

    const results = searchSemanticSkills(graph, index, queryVector, {
      query: "visual screenshot review",
      limit: 3,
    });

    expect(results[0]?.node.id).toBe("visual-qa");
    expect(results[0]?.provider).toBe("semantic");
    expect(results[0]?.reason).toContain("Semantic similarity");
  });

  it("detects stale embedding indexes when node text changes", async () => {
    const graph = await graphWithFixtures();
    const provider = createDeterministicEmbeddingProvider({ dimensions: 32 });
    const index = await buildEmbeddingIndex(graph, {
      provider,
      model: "deterministic-test",
      indexedAt: "2026-05-06T00:00:00.000Z",
    });
    const changedGraph = {
      ...graph,
      nodes: graph.nodes.map((node) =>
        node.id === "visual-qa"
          ? { ...node, description: `${node.description} Updated.` }
          : node,
      ),
    };

    expect(embeddingIndexFreshness(graph, index)).toEqual({ fresh: true });
    expect(embeddingIndexFreshness(changedGraph, index)).toMatchObject({
      fresh: false,
      reason: "source text changed for visual-qa",
    });
  });
});
