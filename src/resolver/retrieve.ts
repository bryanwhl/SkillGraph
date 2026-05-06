import { type SkillGraph, type SkillNode } from "../graph/schema.js";
import { tokenize } from "../shared/strings.js";

export type SearchResult = {
  node: SkillNode;
  score: number;
  reason: string;
};

export function searchSkills(
  graph: SkillGraph,
  query: string,
  limit = 10,
): SearchResult[] {
  const queryTerms = tokenize(query);

  return graph.nodes
    .map((node) => scoreNode(node, queryTerms))
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score || a.node.id.localeCompare(b.node.id))
    .slice(0, limit);
}

function scoreNode(node: SkillNode, queryTerms: string[]): SearchResult {
  const fields = {
    id: tokenize(node.id),
    name: tokenize(node.name),
    title: tokenize(node.title ?? ""),
    description: tokenize(node.description),
    tags: node.tags.flatMap(tokenize),
    capabilities: node.capabilities.flatMap(tokenize),
  };
  const matched = new Set<string>();
  let score = 0;

  for (const term of queryTerms) {
    if (matches(fields.id, term) || matches(fields.name, term)) {
      score += 8;
      matched.add(term);
    }
    if (matches(fields.title, term)) {
      score += 6;
      matched.add(term);
    }
    if (matches(fields.tags, term)) {
      score += 5;
      matched.add(term);
    }
    if (matches(fields.capabilities, term)) {
      score += 4;
      matched.add(term);
    }
    if (matches(fields.description, term)) {
      score += 2;
      matched.add(term);
    }
  }

  if (node.status.installed) {
    score += 1;
  }

  return {
    node,
    score,
    reason:
      matched.size > 0
        ? `Matched ${[...matched].sort().join(", ")}`
        : "No lexical match",
  };
}

function matches(values: string[], term: string): boolean {
  return values.some((value) => value === term || value.includes(term) || term.includes(value));
}
