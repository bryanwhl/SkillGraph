import {
  type ContextDepth,
  type GraphNodeStatus,
  type Resolution,
  type SelectedNode,
  type SkillEdge,
  type SkillGraph,
  type SkillNode,
  resolutionSchema,
} from "../graph/schema.js";
import { searchSkills } from "./retrieve.js";

export type ResolveTaskOptions = {
  task: string;
  agent: string;
  budgetTokens: number;
  now?: string;
};

export function resolveTask(
  graph: SkillGraph,
  options: ResolveTaskOptions,
): Resolution {
  const searchResults = searchSkills(graph, options.task, 8);
  const direct = searchResults[0];
  const selected: SelectedNode[] = [];
  const selectedIds = new Set<string>();

  if (direct) {
    for (const ancestor of ancestorsFor(graph, direct.node.id)) {
      addSelected(selected, selectedIds, ancestor.node, "l1", ancestor.reason);
    }
    addSelected(
      selected,
      selectedIds,
      direct.node,
      preferredDepth(direct.node, options.budgetTokens),
      `Direct match for task. ${direct.reason}.`,
      direct.score,
    );
  }

  let estimatedTokens = selected.reduce(
    (sum, item) => sum + item.tokenEstimate,
    0,
  );

  while (estimatedTokens > options.budgetTokens && selected.length > 0) {
    const fullIndex = selected.findIndex((item) => item.depth === "l3");
    if (fullIndex < 0) {
      break;
    }
    const downgraded = selected[fullIndex];
    if (!downgraded) {
      break;
    }
    const node = graph.nodes.find((candidate) => candidate.id === downgraded.node);
    if (!node) {
      break;
    }
    selected[fullIndex] = selectedNode(
      node,
      "l1",
      `${downgraded.reason} Downgraded to capability-card depth to respect token budget.`,
      downgraded.score,
    );
    estimatedTokens = selected.reduce((sum, item) => sum + item.tokenEstimate, 0);
  }

  const directNodeId = direct?.node.id;
  const frontier = directNodeId
    ? graph.edges
        .filter((edge) => edge.from === directNodeId && edge.type === "complements")
        .map((edge) => ({
          node: edge.to,
          reason: `Complement to ${directNodeId}; expand if the task needs ${edge.to}.`,
          source: nodeSource(graph, edge.to),
        }))
    : [];
  const conflicts = directNodeId
    ? graph.edges
        .filter((edge) => touches(edge, directNodeId) && edge.type === "conflicts_with")
        .map((edge) => ({
          from: edge.from,
          to: edge.to,
          confidence: edge.confidence,
          reason: `${edge.from} may conflict with ${edge.to}; avoid loading both at full depth without review.`,
        }))
    : [];
  const missing = selected
    .filter((item) => item.status === "remote")
    .map((item) => ({
      node: item.node,
      installCommand: installCommandFor(graph, item.node),
      requiresUserApproval: true,
      source: item.source,
      reason: item.reason,
    }));

  return resolutionSchema.parse({
    task: options.task,
    agent: options.agent,
    selected,
    frontier,
    missing,
    conflicts,
    budget: {
      requestedTokens: options.budgetTokens,
      estimatedTokens,
    },
    explanation:
      selected.length > 0
        ? `Selected ${selected.map((item) => item.node).join(" -> ")} for ${options.task}.`
        : `No matching skills found for ${options.task}.`,
    createdAt: options.now ?? new Date().toISOString(),
  });
}

export function explainResolution(resolution: Resolution): string {
  const lines = [
    `# SkillGraph Resolution`,
    "",
    `Task: ${resolution.task}`,
    `Agent: ${resolution.agent}`,
    `Budget: ${resolution.budget.estimatedTokens}/${resolution.budget.requestedTokens} estimated tokens`,
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
      ? resolution.missing.map((item) => `- ${item.node}: ${item.reason}`)
      : ["- None"]),
  ];

  return `${lines.join("\n")}\n`;
}

function addSelected(
  selected: SelectedNode[],
  selectedIds: Set<string>,
  node: SkillNode,
  depth: ContextDepth,
  reason: string,
  score?: number,
): void {
  if (selectedIds.has(node.id)) {
    return;
  }

  selected.push(selectedNode(node, depth, reason, score));
  selectedIds.add(node.id);
}

function selectedNode(
  node: SkillNode,
  depth: ContextDepth,
  reason: string,
  score?: number,
): SelectedNode {
  const layer = depth === "l4" ? node.contextLayers.l4?.[0] : node.contextLayers[depth];

  return {
    node: node.id,
    depth: layer?.depth ?? "l0",
    status: statusFor(node),
    reason,
    score,
    source: node.source.url ?? node.source.path,
    tokenEstimate: layer?.tokenEstimate ?? 0,
  };
}

function ancestorsFor(
  graph: SkillGraph,
  nodeId: string,
): Array<{ node: SkillNode; reason: string }> {
  const ancestors: Array<{ node: SkillNode; reason: string }> = [];
  let currentId = nodeId;
  const seen = new Set<string>();

  while (!seen.has(currentId)) {
    seen.add(currentId);
    const edge = graph.edges.find((candidate) => {
      return candidate.type === "contains" && candidate.to === currentId;
    });
    if (!edge) {
      break;
    }
    const node = graph.nodes.find((candidate) => candidate.id === edge.from);
    if (!node) {
      break;
    }
    ancestors.unshift({
      node,
      reason: `Ancestor context for ${currentId}.`,
    });
    currentId = node.id;
  }

  return ancestors;
}

function preferredDepth(node: SkillNode, budgetTokens: number): ContextDepth {
  const fullCost = node.contextLayers.l3?.tokenEstimate ?? Number.POSITIVE_INFINITY;
  if (node.status.installed && node.contextLayers.l3 && fullCost <= budgetTokens) {
    return "l3";
  }
  return node.contextLayers.l1 ? "l1" : "l0";
}

function statusFor(node: SkillNode): GraphNodeStatus {
  if (node.status.installed) {
    return "local";
  }
  if (node.source.type === "manual") {
    return "virtual";
  }
  return "remote";
}

function touches(edge: SkillEdge, nodeId: string): boolean {
  return edge.from === nodeId || edge.to === nodeId;
}

function nodeSource(graph: SkillGraph, nodeId: string): string | undefined {
  const node = graph.nodes.find((candidate) => candidate.id === nodeId);
  return node?.source.url ?? node?.source.path;
}

function installCommandFor(graph: SkillGraph, nodeId: string): string | undefined {
  const node = graph.nodes.find((candidate) => candidate.id === nodeId);
  if (!node) {
    return undefined;
  }
  if (node.source.repository) {
    return `npx skills add ${node.source.repository} --skill ${node.name}`;
  }
  if (node.source.url) {
    return `npx skills add ${node.source.url} --skill ${node.name}`;
  }

  return undefined;
}
