import {
  type LoadedContextEntry,
  type Resolution,
  type SkillGraph,
} from "../graph/schema.js";
import { type SkillsShSearchResult } from "../adapters/skills-sh.js";
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

export function formatSkillsShSearchMarkdown(
  results: SkillsShSearchResult[],
): string {
  if (results.length === 0) {
    return "No remote skills found.\n";
  }

  return `${[
    "# SkillGraph Remote Cache",
    "",
    ...results.map((result, index) => {
      const installs =
        result.installCount === undefined
          ? "install count unavailable"
          : `${result.installCount.toLocaleString("en-US")} installs`;
      return `${index + 1}. ${result.locator} (${installs})\n   ${result.url}\n   Install after approval: \`${result.installCommand}\``;
    }),
  ].join("\n")}\n`;
}

export function formatLoadedContextMarkdown(
  loaded: LoadedContextEntry[],
): string {
  if (loaded.length === 0) {
    return "No context has been loaded yet.\n";
  }

  return `${[
    "# SkillGraph Loaded Context",
    "",
    ...loaded.map(
      (entry, index) =>
        `${index + 1}. ${entry.node} (${entry.depth}, ${entry.tokenEstimate} tokens): ${entry.label}`,
    ),
  ].join("\n")}\n`;
}
