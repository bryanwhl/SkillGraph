import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "yaml";
import { parseSkillFile } from "../adapters/skill-parser.js";
import { estimateTokens } from "../context/token-estimate.js";
import {
  type SkillEdge,
  type SkillGraph,
  type SkillNode,
  type SourceType,
  skillEdgeSchema,
  skillGraphSchema,
  skillNodeSchema,
} from "./schema.js";

export type IndexSkillsOptions = {
  cwd: string;
  skillRoots: string[];
  graphFiles?: string[];
  now?: string;
};

type ManualGraphFile = {
  nodes?: ManualNode[];
  edges?: ManualEdge[];
};

type ManualNode = {
  id: string;
  name?: string;
  title?: string;
  kind?: string;
  description?: string;
  source?: {
    type?: SourceType;
    path?: string;
    url?: string;
    repository?: string;
  };
  tags?: string[];
  capabilities?: string[];
};

type ManualEdge = {
  from: string;
  to: string;
  type: SkillEdge["type"];
  confidence?: number;
  source?: {
    kind?: "manual" | "heuristic" | "inferred";
    method?: string;
  };
};

export async function indexSkills(options: IndexSkillsOptions): Promise<SkillGraph> {
  const indexedAt = options.now ?? new Date().toISOString();
  const skillFiles = await findSkillFiles(options.skillRoots);
  const parsedNodes = await Promise.all(
    skillFiles.map((filePath) =>
      parseSkillFile(filePath, {
        rootPath: path.dirname(filePath),
        sourceType: classifySourceType(filePath, options.cwd),
        now: indexedAt,
      }),
    ),
  );
  const manual = await readManualGraphs(options.graphFiles ?? [], indexedAt);
  const nodesById = new Map<string, SkillNode>();

  for (const node of manual.nodes) {
    nodesById.set(node.id, node);
  }

  for (const node of parsedNodes) {
    nodesById.set(node.id, mergeNode(nodesById.get(node.id), node));
  }

  return skillGraphSchema.parse({
    version: 1,
    indexedAt,
    nodes: [...nodesById.values()].sort((a, b) => a.id.localeCompare(b.id)),
    edges: manual.edges,
  });
}

async function findSkillFiles(roots: string[]): Promise<string[]> {
  const files = new Set<string>();

  for (const root of roots) {
    if (!(await exists(root))) {
      continue;
    }
    await collectSkillFiles(path.resolve(root), files);
  }

  return [...files].sort((a, b) => a.localeCompare(b));
}

async function collectSkillFiles(currentPath: string, files: Set<string>): Promise<void> {
  const entries = await readdir(currentPath, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(currentPath, entry.name);
    if (entry.isFile() && entry.name === "SKILL.md") {
      files.add(entryPath);
      continue;
    }

    if (entry.isDirectory() && !ignoredDirectory(entry.name)) {
      await collectSkillFiles(entryPath, files);
    }
  }
}

function ignoredDirectory(name: string): boolean {
  return [".git", "node_modules", "dist", "coverage", ".skillgraph"].includes(name);
}

async function readManualGraphs(
  graphFiles: string[],
  indexedAt: string,
): Promise<{ nodes: SkillNode[]; edges: SkillEdge[] }> {
  const nodes: SkillNode[] = [];
  const edges: SkillEdge[] = [];

  for (const graphFile of graphFiles) {
    if (!(await exists(graphFile))) {
      continue;
    }

    const parsed = parse(await readFile(graphFile, "utf8")) as ManualGraphFile | null;
    for (const node of parsed?.nodes ?? []) {
      nodes.push(manualNodeToSkillNode(node, indexedAt));
    }
    for (const edge of parsed?.edges ?? []) {
      edges.push(
        skillEdgeSchema.parse({
          from: edge.from,
          to: edge.to,
          type: edge.type,
          confidence: edge.confidence ?? 1,
          source: {
            kind: edge.source?.kind ?? "manual",
            method: edge.source?.method,
          },
        }),
      );
    }
  }

  return { nodes, edges };
}

function manualNodeToSkillNode(node: ManualNode, indexedAt: string): SkillNode {
  const name = node.name ?? node.id;
  const description = node.description ?? "";
  const l0Content = `${name}: ${description}`.trim();
  const sourceType = node.source?.type ?? "manual";

  return skillNodeSchema.parse({
    id: node.id,
    name,
    title: node.title ?? name,
    kind: node.kind ?? "domain",
    description,
    source: {
      type: sourceType,
      path: node.source?.path,
      url: node.source?.url,
      repository: node.source?.repository,
    },
    runtime: {
      compatible: ["codex", "claude"],
    },
    status: {
      installed: false,
      localPath: undefined,
    },
    tags: node.tags ?? [],
    capabilities: node.capabilities ?? [],
    contextLayers: {
      l0: {
        depth: "l0",
        label: "metadata",
        tokenEstimate: estimateTokens(l0Content),
        content: l0Content,
      },
      l1: {
        depth: "l1",
        label: "capability card",
        tokenEstimate: estimateTokens([`# ${node.title ?? name}`, description].join("\n\n")),
        content: [`# ${node.title ?? name}`, description].filter(Boolean).join("\n\n"),
      },
    },
    provenance: {
      indexedAt,
      adapter: "manual",
      confidence: 1,
    },
  });
}

function mergeNode(existing: SkillNode | undefined, incoming: SkillNode): SkillNode {
  if (!existing) {
    return incoming;
  }

  return skillNodeSchema.parse({
    ...existing,
    ...incoming,
    tags: [...new Set([...existing.tags, ...incoming.tags])].sort(),
    capabilities: [...new Set([...existing.capabilities, ...incoming.capabilities])].sort(),
    contextLayers: {
      ...existing.contextLayers,
      ...incoming.contextLayers,
    },
  });
}

function classifySourceType(filePath: string, cwd: string): SourceType {
  const normalized = filePath.toLowerCase();
  const normalizedCwd = path.resolve(cwd).toLowerCase();

  if (normalized.startsWith(normalizedCwd) && normalized.includes(`${path.sep}.agents${path.sep}`)) {
    return "project";
  }
  if (normalized.includes(`${path.sep}.claude${path.sep}`)) {
    return "local_claude";
  }
  if (normalized.includes(`${path.sep}.codex${path.sep}`)) {
    return "local_codex";
  }

  return "project";
}

async function exists(targetPath: string): Promise<boolean> {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}
