import { describe, expect, it } from "vitest";
import {
  buildEmbeddingIndex,
  createDeterministicEmbeddingProvider,
} from "../src/embeddings/indexer.js";
import { suggestEmbeddingEdges } from "../src/graph/edge-suggestions.js";
import { indexSkills } from "../src/graph/builder.js";
import { fixturePath } from "./support/paths.js";

async function graphWithFixtures() {
  return indexSkills({
    cwd: fixturePath(),
    skillRoots: [fixturePath("skills")],
    graphFiles: [fixturePath("skill-graph.yaml")],
    now: "2026-05-06T00:00:00.000Z",
  });
}

describe("edge suggestions", () => {
  it("proposes review-required inferred edges from embedding similarity", async () => {
    const graph = await graphWithFixtures();
    const provider = createDeterministicEmbeddingProvider({ dimensions: 64 });
    const index = await buildEmbeddingIndex(graph, {
      provider,
      indexedAt: "2026-05-06T00:00:00.000Z",
    });

    const suggestions = suggestEmbeddingEdges(graph, index, {
      limit: 3,
      minConfidence: 0.05,
    });

    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions).toHaveLength(3);
    expect(suggestions[0]).toMatchObject({
      reviewStatus: "proposed",
      source: {
        kind: "inferred",
        method: "embedding_similarity",
      },
    });
    expect(
      graph.edges.some(
        (edge) =>
          edge.from === suggestions[0]?.from && edge.to === suggestions[0]?.to,
      ),
    ).toBe(false);
  });

  it("refuses stale embedding indexes", async () => {
    const graph = await graphWithFixtures();
    const provider = createDeterministicEmbeddingProvider({ dimensions: 64 });
    const index = await buildEmbeddingIndex(graph, {
      provider,
      indexedAt: "2026-05-06T00:00:00.000Z",
    });
    const staleGraph = {
      ...graph,
      nodes: graph.nodes.slice(1),
    };

    expect(() => suggestEmbeddingEdges(staleGraph, index)).toThrow(
      /embedding index is stale/i,
    );
  });
});
