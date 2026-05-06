import { type Resolution, type SkillGraph } from "../graph/schema.js";
import { type SearchResult } from "../resolver/retrieve.js";

export function formatSearchMarkdown(results: SearchResult[]): string {
  if (results.length === 0) {
    return "No matching skills found.\n";
  }

  return `${[
    "# SkillGraph Search",
    "",
    ...results.map(
      (result, index) =>
        `${index + 1}. ${result.node.id} (${result.provider}, ${result.score.toFixed(1)}): ${result.reason}`,
    ),
  ].join("\n")}\n`;
}

export function formatResolutionMarkdown(resolution: Resolution): string {
  const lines = [
    "# SkillGraph Resolution",
    "",
    `Task: ${resolution.task}`,
    `Token budget: ${resolution.budget.estimatedTokens}/${resolution.budget.requestedTokens}`,
    "",
    "## Selected",
    ...resolution.selected.map(
      (item) =>
        `- ${item.node} (${item.depth}, ${item.status}): ${item.reason}`,
    ),
    "",
    "## Frontier",
    ...(resolution.frontier.length > 0
      ? resolution.frontier.map((item) => `- ${item.node}: ${item.reason}`)
      : ["- None"]),
    "",
    "## Conflicts",
    ...(resolution.conflicts.length > 0
      ? resolution.conflicts.map((item) => `- ${item.from} vs ${item.to}: ${item.reason}`)
      : ["- None"]),
    "",
    "## Missing",
    ...(resolution.missing.length > 0
      ? resolution.missing.map((item) => {
          const command = item.installCommand ? ` Install: \`${item.installCommand}\`.` : "";
          return `- ${item.node}: ${item.reason}${command}`;
        })
      : ["- None"]),
  ];

  return `${lines.join("\n")}\n`;
}

export function formatIndexSummary(graph: SkillGraph): string {
  return `Indexed ${graph.nodes.length} nodes and ${graph.edges.length} edges.\n`;
}
