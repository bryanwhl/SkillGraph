import { readFile } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { buildOperationalSummary } from "../context/operational-summary.js";
import { estimateTokens } from "../context/token-estimate.js";
import { type SkillNode, type SourceType, skillNodeSchema } from "../graph/schema.js";
import { slugify, titleFromMarkdown, unique } from "../shared/strings.js";

type FrontmatterValue = string | string[] | undefined;

export type ParseSkillOptions = {
  rootPath: string;
  sourceType: SourceType;
  now?: string;
};

export async function parseSkillFile(
  filePath: string,
  options: ParseSkillOptions,
): Promise<SkillNode> {
  const raw = await readFile(filePath, "utf8");
  const parsed = matter(raw);
  const data = parsed.data as Record<string, FrontmatterValue>;
  const directoryName = path.basename(path.dirname(filePath));
  const name = normalizeString(data.name) ?? directoryName;
  const title = normalizeString(data.title) ?? titleFromMarkdown(parsed.content) ?? name;
  const description =
    normalizeString(data.description) ?? firstMeaningfulParagraph(parsed.content);
  const tags = normalizeList(data.tags);
  const capabilities = normalizeList(data.capabilities);
  const id = slugify(name);
  const l0Content = [
    `${name}: ${description}`,
    tags.length > 0 ? `Tags: ${tags.join(", ")}` : "",
    capabilities.length > 0 ? `Capabilities: ${capabilities.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  const l1Content = buildCapabilityCard({
    title,
    description,
    tags,
    capabilities,
  });
  const l2Content = buildOperationalSummary({
    title,
    description,
    tags,
    capabilities,
    markdown: parsed.content,
  });

  const node: SkillNode = {
    id,
    name,
    title,
    kind: "skill",
    description,
    source: {
      type: options.sourceType,
      path: filePath,
    },
    runtime: {
      compatible: ["codex", "claude"],
    },
    status: {
      installed: true,
      localPath: filePath,
    },
    tags: unique(tags),
    capabilities: unique(capabilities),
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
        tokenEstimate: estimateTokens(l1Content),
        content: l1Content,
      },
      l2: {
        depth: "l2",
        label: "operational summary",
        tokenEstimate: estimateTokens(l2Content),
        content: l2Content,
      },
      l3: {
        depth: "l3",
        label: "full skill",
        tokenEstimate: estimateTokens(raw),
        contentRef: filePath,
      },
    },
    provenance: {
      indexedAt: options.now ?? new Date().toISOString(),
      adapter: options.sourceType,
      confidence: 1,
    },
  };

  return skillNodeSchema.parse(node);
}

function normalizeString(value: FrontmatterValue): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeList(value: FrontmatterValue): string[] {
  if (Array.isArray(value)) {
    return value.map(String).map((item) => item.trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function firstMeaningfulParagraph(markdown: string): string {
  const paragraph = markdown
    .split(/\n\s*\n/)
    .map((part) => part.replace(/^#+\s+/gm, "").trim())
    .find((part) => part.length > 0);

  return paragraph ?? "No description provided.";
}

function buildCapabilityCard(input: {
  title: string;
  description: string;
  tags: string[];
  capabilities: string[];
}): string {
  return [
    `# ${input.title}`,
    "",
    input.description,
    input.tags.length > 0 ? `Tags: ${input.tags.join(", ")}` : "",
    input.capabilities.length > 0
      ? `Capabilities: ${input.capabilities.join(", ")}`
      : "",
  ]
    .filter((line) => line.length > 0)
    .join("\n");
}
