import { z } from "zod";
import {
  type EmbeddingIndex,
  embeddingIndexFreshness,
} from "../embeddings/indexer.js";
import {
  type EdgeType,
  type GraphIndex,
  type SkillNode,
  edgeTypeSchema,
} from "./schema.js";
import { tokenize } from "../shared/strings.js";

export const edgeSuggestionSchema = z.object({
  from: z.string(),
  to: z.string(),
  type: edgeTypeSchema,
  confidence: z.number().min(0).max(1),
  similarity: z.number().min(0).max(1),
  reason: z.string(),
  reviewStatus: z.literal("proposed"),
  source: z.object({
    kind: z.literal("inferred"),
    method: z.literal("embedding_similarity"),
  }),
});
export type EdgeSuggestion = z.infer<typeof edgeSuggestionSchema>;

export type SuggestEmbeddingEdgesOptions = {
  limit?: number;
  minConfidence?: number;
};

export function suggestEmbeddingEdges(
  graph: GraphIndex,
  index: EmbeddingIndex,
  options: SuggestEmbeddingEdgesOptions = {},
): EdgeSuggestion[] {
  const freshness = embeddingIndexFreshness(graph, index);
  if (!freshness.fresh) {
    throw new Error(
      `Semantic embedding index is stale (${freshness.reason}). Run \`skill-graph embeddings index\` again.`,
    );
  }

  const limit = options.limit ?? 10;
  const minConfidence = options.minConfidence ?? 0.35;
  const vectorByNode = new Map(index.vectors.map((entry) => [entry.node, entry.vector]));
  const existingPairs = new Set(
    graph.edges.flatMap((edge) => [
      edgeKey(edge.from, edge.to),
      edgeKey(edge.to, edge.from),
    ]),
  );
  const suggestions: EdgeSuggestion[] = [];

  for (let leftIndex = 0; leftIndex < graph.nodes.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < graph.nodes.length; rightIndex += 1) {
      const left = graph.nodes[leftIndex];
      const right = graph.nodes[rightIndex];
      if (!left || !right || existingPairs.has(edgeKey(left.id, right.id))) {
        continue;
      }

      const leftVector = vectorByNode.get(left.id);
      const rightVector = vectorByNode.get(right.id);
      if (!leftVector || !rightVector) {
        continue;
      }

      const similarity = clamp(cosineSimilarity(leftVector, rightVector));
      const confidence = round(similarity);
      if (confidence < minConfidence) {
        continue;
      }

      suggestions.push(
        edgeSuggestionSchema.parse({
          from: left.id,
          to: right.id,
          type: inferEdgeType(left, right, similarity),
          confidence,
          similarity: confidence,
          reviewStatus: "proposed",
          source: {
            kind: "inferred",
            method: "embedding_similarity",
          },
          reason: `Embedding similarity ${confidence.toFixed(3)} between normalized skill context; proposed for human review.`,
        }),
      );
    }
  }

  return suggestions
    .sort(
      (left, right) =>
        right.confidence - left.confidence ||
        left.from.localeCompare(right.from) ||
        left.to.localeCompare(right.to),
    )
    .slice(0, limit);
}

function inferEdgeType(left: SkillNode, right: SkillNode, similarity: number): EdgeType {
  const sharedTags = intersection(left.tags, right.tags).length;
  const sharedCapabilities = intersection(left.capabilities, right.capabilities).length;
  if (similarity >= 0.8 && (sharedTags > 0 || sharedCapabilities > 0)) {
    return "duplicates";
  }
  if (isSpecializationCandidate(left, right) || isSpecializationCandidate(right, left)) {
    return "specializes";
  }
  return "complements";
}

function isSpecializationCandidate(left: SkillNode, right: SkillNode): boolean {
  const leftTerms = new Set(tokenize([left.id, left.name, left.title ?? ""].join(" ")));
  const rightTerms = new Set(tokenize([right.id, right.name, right.title ?? ""].join(" ")));
  if (rightTerms.size === 0) {
    return false;
  }
  return [...rightTerms].every((term) => leftTerms.has(term));
}

function intersection(left: string[], right: string[]): string[] {
  const rightValues = new Set(right);
  return left.filter((value) => rightValues.has(value));
}

function cosineSimilarity(left: number[], right: number[]): number {
  const length = Math.min(left.length, right.length);
  let sum = 0;
  for (let index = 0; index < length; index += 1) {
    sum += (left[index] ?? 0) * (right[index] ?? 0);
  }
  return sum;
}

function clamp(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function edgeKey(from: string, to: string): string {
  return `${from}\0${to}`;
}
