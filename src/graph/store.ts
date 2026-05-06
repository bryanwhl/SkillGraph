import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  type EmbeddingIndex,
  embeddingIndexSchema,
} from "../embeddings/indexer.js";
import { slugify } from "../shared/strings.js";
import {
  type LoadedContextEntry,
  type Resolution,
  type GraphIndex,
  loadedContextEntrySchema,
  resolutionSchema,
  graphIndexSchema,
} from "./schema.js";

export function stateDirectory(cwd: string): string {
  return path.join(cwd, ".skill-graph");
}

export function graphPath(cwd: string): string {
  return path.join(stateDirectory(cwd), "index.json");
}

export function edgesPath(cwd: string): string {
  return path.join(stateDirectory(cwd), "edges.json");
}

export function lastResolutionPath(cwd: string): string {
  return path.join(stateDirectory(cwd), "last-resolution.json");
}

export function loadedContextPath(cwd: string): string {
  return path.join(stateDirectory(cwd), "loaded-context.json");
}

export function embeddingsPath(cwd: string): string {
  return path.join(stateDirectory(cwd), "embeddings.json");
}

export function cacheDirectory(cwd: string): string {
  return path.join(stateDirectory(cwd), "cache");
}

export function skillsShCachePath(cwd: string, query: string): string {
  return path.join(
    cacheDirectory(cwd),
    "skills-sh",
    `${slugify(query) || "all"}.json`,
  );
}

export async function saveGraph(cwd: string, graph: GraphIndex): Promise<void> {
  await mkdir(stateDirectory(cwd), { recursive: true });
  await writeFile(graphPath(cwd), `${JSON.stringify(graph, null, 2)}\n`, "utf8");
  await writeFile(edgesPath(cwd), `${JSON.stringify(graph.edges, null, 2)}\n`, "utf8");
}

export async function loadGraph(cwd: string): Promise<GraphIndex> {
  const raw = await readFile(graphPath(cwd), "utf8");
  return graphIndexSchema.parse(JSON.parse(raw));
}

export async function saveLastResolution(
  cwd: string,
  resolution: Resolution,
): Promise<void> {
  await mkdir(stateDirectory(cwd), { recursive: true });
  await writeFile(
    lastResolutionPath(cwd),
    `${JSON.stringify(resolution, null, 2)}\n`,
    "utf8",
  );
}

export async function loadLastResolution(cwd: string): Promise<Resolution> {
  const raw = await readFile(lastResolutionPath(cwd), "utf8");
  return resolutionSchema.parse(JSON.parse(raw));
}

export async function appendLoadedContext(
  cwd: string,
  entry: LoadedContextEntry,
): Promise<void> {
  await mkdir(stateDirectory(cwd), { recursive: true });
  const loaded = await loadLoadedContext(cwd);
  loaded.push(loadedContextEntrySchema.parse(entry));
  await writeFile(
    loadedContextPath(cwd),
    `${JSON.stringify(loaded, null, 2)}\n`,
    "utf8",
  );
}

export async function loadLoadedContext(cwd: string): Promise<LoadedContextEntry[]> {
  try {
    const raw = await readFile(loadedContextPath(cwd), "utf8");
    return zodLoadedContext(raw);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

export async function saveEmbeddingIndex(
  cwd: string,
  index: EmbeddingIndex,
): Promise<void> {
  await mkdir(stateDirectory(cwd), { recursive: true });
  await writeFile(
    embeddingsPath(cwd),
    `${JSON.stringify(embeddingIndexSchema.parse(index), null, 2)}\n`,
    "utf8",
  );
}

export async function loadEmbeddingIndex(cwd: string): Promise<EmbeddingIndex> {
  const raw = await readFile(embeddingsPath(cwd), "utf8");
  return embeddingIndexSchema.parse(JSON.parse(raw));
}

export async function tryLoadEmbeddingIndex(
  cwd: string,
): Promise<EmbeddingIndex | undefined> {
  try {
    return await loadEmbeddingIndex(cwd);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return undefined;
    }
    throw error;
  }
}

export async function saveSkillsShSearchCache<T>(
  cwd: string,
  query: string,
  value: T,
): Promise<void> {
  const targetPath = skillsShCachePath(cwd, query);
  await mkdir(path.dirname(targetPath), { recursive: true });
  await writeFile(targetPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function zodLoadedContext(raw: string): LoadedContextEntry[] {
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) {
    return [];
  }
  return parsed.map((entry) => loadedContextEntrySchema.parse(entry));
}
