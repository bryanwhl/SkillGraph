import { readFile } from "node:fs/promises";
import {
  type ContextDepth,
  type GraphIndex,
  type SkillNode,
} from "../graph/schema.js";

export type ExpandDepth = ContextDepth | "full" | "summary" | "capability_card";

export type ExpandedContext = {
  node: string;
  depth: ContextDepth;
  label: string;
  tokenEstimate: number;
  content: string;
};

export async function expandNode(
  graph: GraphIndex,
  nodeId: string,
  requestedDepth: ExpandDepth,
): Promise<ExpandedContext> {
  const node = graph.nodes.find((candidate) => candidate.id === nodeId);
  if (!node) {
    throw new Error(`Unknown node: ${nodeId}`);
  }

  const depth = resolveDepth(node, requestedDepth);
  const layer =
    depth === "l4"
      ? node.contextLayers.l4?.[0]
      : node.contextLayers[depth];

  if (!layer) {
    throw new Error(`Node ${nodeId} does not have context depth ${requestedDepth}`);
  }

  return {
    node: node.id,
    depth: layer.depth,
    label: layer.label,
    tokenEstimate: layer.tokenEstimate,
    content: await readLayerContent(layer),
  };
}

function resolveDepth(node: SkillNode, requestedDepth: ExpandDepth): ContextDepth {
  if (requestedDepth === "full") {
    return node.contextLayers.l3 ? "l3" : "l1";
  }
  if (requestedDepth === "summary") {
    return node.contextLayers.l2 ? "l2" : "l1";
  }
  if (requestedDepth === "capability_card") {
    return "l1";
  }

  return requestedDepth;
}

async function readLayerContent(layer: {
  content?: string | undefined;
  contentRef?: string | undefined;
}): Promise<string> {
  if (layer.content !== undefined) {
    return layer.content;
  }
  if (layer.contentRef) {
    return readFile(layer.contentRef, "utf8");
  }

  return "";
}
