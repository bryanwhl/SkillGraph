import { z } from "zod";

export const contextDepthSchema = z.enum(["l0", "l1", "l2", "l3", "l4"]);
export type ContextDepth = z.infer<typeof contextDepthSchema>;

export const contextLayerSchema = z.object({
  depth: contextDepthSchema,
  label: z.string(),
  tokenEstimate: z.number().int().nonnegative(),
  content: z.string().optional(),
  contentRef: z.string().optional(),
});
export type ContextLayer = z.infer<typeof contextLayerSchema>;

export const sourceTypeSchema = z.enum([
  "project",
  "local_codex",
  "local_claude",
  "manual",
  "skills_sh",
  "github",
]);
export type SourceType = z.infer<typeof sourceTypeSchema>;

export const skillNodeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  title: z.string().optional(),
  kind: z.string().default("skill"),
  description: z.string().default(""),
  source: z.object({
    type: sourceTypeSchema,
    path: z.string().optional(),
    url: z.string().optional(),
    repository: z.string().optional(),
  }),
  runtime: z.object({
    compatible: z.array(z.string()),
  }),
  status: z.object({
    installed: z.boolean(),
    localPath: z.string().optional(),
  }),
  tags: z.array(z.string()),
  capabilities: z.array(z.string()),
  contextLayers: z.object({
    l0: contextLayerSchema,
    l1: contextLayerSchema.optional(),
    l2: contextLayerSchema.optional(),
    l3: contextLayerSchema.optional(),
    l4: z.array(contextLayerSchema).optional(),
  }),
  provenance: z.object({
    indexedAt: z.string(),
    adapter: z.string(),
    confidence: z.number().min(0).max(1),
  }),
});
export type SkillNode = z.infer<typeof skillNodeSchema>;

export const edgeTypeSchema = z.enum([
  "contains",
  "requires",
  "specializes",
  "complements",
  "conflicts_with",
  "duplicates",
  "supersedes",
  "applies_to",
]);
export type EdgeType = z.infer<typeof edgeTypeSchema>;

export const skillEdgeSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  type: edgeTypeSchema,
  confidence: z.number().min(0).max(1),
  source: z.object({
    kind: z.enum(["manual", "heuristic", "inferred"]).default("manual"),
    method: z.string().optional(),
  }),
});
export type SkillEdge = z.infer<typeof skillEdgeSchema>;

export const skillGraphSchema = z.object({
  version: z.literal(1),
  indexedAt: z.string(),
  nodes: z.array(skillNodeSchema),
  edges: z.array(skillEdgeSchema),
});
export type SkillGraph = z.infer<typeof skillGraphSchema>;

export const selectedNodeSchema = z.object({
  node: z.string(),
  depth: contextDepthSchema,
  status: z.enum(["local", "remote", "virtual"]),
  reason: z.string(),
  score: z.number().optional(),
  source: z.string().optional(),
  tokenEstimate: z.number().int().nonnegative(),
});
export type SelectedNode = z.infer<typeof selectedNodeSchema>;

export const resolutionSchema = z.object({
  task: z.string(),
  agent: z.string(),
  selected: z.array(selectedNodeSchema),
  frontier: z.array(
    z.object({
      node: z.string(),
      reason: z.string(),
      source: z.string().optional(),
    }),
  ),
  missing: z.array(
    z.object({
      node: z.string(),
      installCommand: z.string().optional(),
      requiresUserApproval: z.boolean(),
      source: z.string().optional(),
      reason: z.string(),
    }),
  ),
  conflicts: z.array(
    z.object({
      from: z.string(),
      to: z.string(),
      confidence: z.number(),
      reason: z.string(),
    }),
  ),
  budget: z.object({
    requestedTokens: z.number().int().positive(),
    estimatedTokens: z.number().int().nonnegative(),
  }),
  explanation: z.string(),
  createdAt: z.string(),
});
export type Resolution = z.infer<typeof resolutionSchema>;

export type GraphNodeStatus = SelectedNode["status"];
