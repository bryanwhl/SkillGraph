import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { z } from "zod";
import { type GraphIndex, type SkillNode } from "../graph/schema.js";
import {
  type SearchProviderName,
  type SearchResult,
} from "../resolver/retrieve.js";
import { tokenize } from "../shared/strings.js";

export const EMBEDDING_PROVIDER_NAMES = ["deterministic", "qwen3-local"] as const;
export type EmbeddingProviderName = (typeof EMBEDDING_PROVIDER_NAMES)[number];

export const DEFAULT_QWEN3_EMBEDDING_MODEL = "Qwen/Qwen3-Embedding-0.6B";

export type EmbeddingProvider = {
  name: EmbeddingProviderName;
  model: string;
  embedDocuments(texts: string[]): Promise<number[][]>;
  embedQuery(text: string): Promise<number[]>;
};

export type DeterministicEmbeddingOptions = {
  dimensions?: number;
};

export type Qwen3LocalEmbeddingOptions = {
  model?: string;
  python?: string;
  trustRemoteCode?: boolean;
};

export const embeddingVectorSchema = z.object({
  node: z.string(),
  textHash: z.string(),
  vector: z.array(z.number()),
});
export type EmbeddingVector = z.infer<typeof embeddingVectorSchema>;

export const embeddingIndexSchema = z.object({
  version: z.literal(1),
  provider: z.enum(EMBEDDING_PROVIDER_NAMES),
  model: z.string(),
  dimensions: z.number().int().positive(),
  indexedAt: z.string(),
  graphIndexedAt: z.string(),
  vectors: z.array(embeddingVectorSchema),
});
export type EmbeddingIndex = z.infer<typeof embeddingIndexSchema>;

export type BuildEmbeddingIndexOptions = {
  provider: EmbeddingProvider;
  model?: string;
  indexedAt?: string;
};

export type SemanticSearchOptions = {
  query: string;
  limit?: number;
};

export type EmbeddingIndexFreshness = {
  fresh: boolean;
  reason?: string;
};

export function createDeterministicEmbeddingProvider(
  options: DeterministicEmbeddingOptions = {},
): EmbeddingProvider {
  const dimensions = options.dimensions ?? 128;

  return {
    name: "deterministic",
    model: `deterministic-${dimensions}`,
    async embedDocuments(texts) {
      return texts.map((text) => deterministicVector(text, dimensions));
    },
    async embedQuery(text) {
      return deterministicVector(text, dimensions);
    },
  };
}

export function createQwen3LocalEmbeddingProvider(
  options: Qwen3LocalEmbeddingOptions = {},
): EmbeddingProvider {
  const model = options.model ?? DEFAULT_QWEN3_EMBEDDING_MODEL;
  const python = options.python ?? process.env.SKILL_GRAPH_PYTHON ?? "python";
  const trustRemoteCode = options.trustRemoteCode ?? false;

  return {
    name: "qwen3-local",
    model,
    async embedDocuments(texts) {
      return runQwen3EmbeddingScript({
        python,
        model,
        trustRemoteCode,
        texts,
      });
    },
    async embedQuery(text) {
      const [vector] = await runQwen3EmbeddingScript({
        python,
        model,
        trustRemoteCode,
        texts: [text],
      });
      if (!vector) {
        throw new Error("Qwen3 embedding provider returned no query vector.");
      }
      return vector;
    },
  };
}

export function embeddingProviderForName(
  name: EmbeddingProviderName,
  options: {
    model?: string;
    dimensions?: number;
    trustRemoteCode?: boolean;
  } = {},
): EmbeddingProvider {
  if (name === "deterministic") {
    return createDeterministicEmbeddingProvider(
      options.dimensions === undefined ? {} : { dimensions: options.dimensions },
    );
  }
  return createQwen3LocalEmbeddingProvider({
    ...(options.model === undefined ? {} : { model: options.model }),
    ...(options.trustRemoteCode === undefined
      ? {}
      : { trustRemoteCode: options.trustRemoteCode }),
  });
}

export async function buildEmbeddingIndex(
  graph: GraphIndex,
  options: BuildEmbeddingIndexOptions,
): Promise<EmbeddingIndex> {
  const texts = graph.nodes.map(nodeToEmbeddingText);
  const vectors = await options.provider.embedDocuments(texts);
  const dimensions = vectors[0]?.length;
  if (!dimensions) {
    throw new Error("Embedding provider returned no vectors.");
  }

  return embeddingIndexSchema.parse({
    version: 1,
    provider: options.provider.name,
    model: options.model ?? options.provider.model,
    dimensions,
    indexedAt: options.indexedAt ?? new Date().toISOString(),
    graphIndexedAt: graph.indexedAt,
    vectors: graph.nodes.map((node, index) => ({
      node: node.id,
      textHash: sha256(texts[index] ?? ""),
      vector: normalizeVector(vectors[index] ?? []),
    })),
  });
}

export function searchSemanticSkills(
  graph: GraphIndex,
  index: EmbeddingIndex,
  queryVector: number[],
  options: SemanticSearchOptions,
): SearchResult[] {
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  const normalizedQuery = normalizeVector(queryVector);
  const matchedTerms = tokenize(options.query);

  return index.vectors
    .map((entry) => {
      const node = nodeById.get(entry.node);
      if (!node) {
        return undefined;
      }
      const score = cosineSimilarity(normalizedQuery, entry.vector);
      return {
        node,
        score,
        provider: "semantic" as SearchProviderName,
        matchedFields: ["embedding"],
        matchedTerms,
        reason: `Semantic similarity using ${index.model}`,
      };
    })
    .filter((result): result is SearchResult => Boolean(result))
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score || a.node.id.localeCompare(b.node.id))
    .slice(0, options.limit ?? 10);
}

export function embeddingIndexFreshness(
  graph: GraphIndex,
  index: EmbeddingIndex,
): EmbeddingIndexFreshness {
  if (index.vectors.length !== graph.nodes.length) {
    return {
      fresh: false,
      reason: `expected ${graph.nodes.length} vectors but found ${index.vectors.length}`,
    };
  }

  const vectorByNode = new Map(index.vectors.map((entry) => [entry.node, entry]));
  for (const node of graph.nodes) {
    const entry = vectorByNode.get(node.id);
    if (!entry) {
      return {
        fresh: false,
        reason: `missing vector for ${node.id}`,
      };
    }

    if (entry.textHash !== sha256(nodeToEmbeddingText(node))) {
      return {
        fresh: false,
        reason: `source text changed for ${node.id}`,
      };
    }
  }

  return { fresh: true };
}

export function nodeToEmbeddingText(node: SkillNode): string {
  return [
    node.name,
    node.title,
    node.description,
    node.tags.join(" "),
    node.capabilities.join(" "),
    node.contextLayers.l1?.content,
    node.contextLayers.l2?.content,
  ]
    .filter(Boolean)
    .join("\n");
}

function deterministicVector(text: string, dimensions: number): number[] {
  const vector = Array.from({ length: dimensions }, () => 0);
  const terms = tokenize(text);

  for (const term of terms) {
    const hash = createHash("sha256").update(term).digest();
    const index = hash.readUInt32BE(0) % dimensions;
    const sign = hash[4] && hash[4] % 2 === 0 ? 1 : -1;
    vector[index] = (vector[index] ?? 0) + sign;
  }

  return normalizeVector(vector);
}

function normalizeVector(vector: number[]): number[] {
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value ** 2, 0));
  if (magnitude === 0) {
    return vector;
  }
  return vector.map((value) => value / magnitude);
}

function cosineSimilarity(left: number[], right: number[]): number {
  const length = Math.min(left.length, right.length);
  let sum = 0;
  for (let index = 0; index < length; index += 1) {
    sum += (left[index] ?? 0) * (right[index] ?? 0);
  }
  return sum;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

async function runQwen3EmbeddingScript(input: {
  python: string;
  model: string;
  trustRemoteCode: boolean;
  texts: string[];
}): Promise<number[][]> {
  const scriptPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    "..",
    "scripts",
    "embed-qwen3.py",
  );
  const args = [scriptPath, "--model", input.model];
  if (input.trustRemoteCode) {
    args.push("--trust-remote-code");
  }
  const stdout = await runPythonJson(input.python, args, {
    texts: input.texts,
  });
  const parsed = JSON.parse(stdout) as { vectors?: number[][] };
  if (!Array.isArray(parsed.vectors)) {
    throw new Error("Qwen3 embedding provider returned invalid JSON.");
  }
  return parsed.vectors.map(normalizeVector);
}

async function runPythonJson(
  command: string,
  args: string[],
  payload: unknown,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout);
        return;
      }
      reject(new Error(stderr.trim() || `Embedding provider exited with ${code}.`));
    });
    child.stdin.end(JSON.stringify(payload));
  });
}
