import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { slugify } from "../shared/strings.js";
import {
  type Resolution,
  type SkillGraph,
  resolutionSchema,
  skillGraphSchema,
} from "./schema.js";

export function stateDirectory(cwd: string): string {
  return path.join(cwd, ".skillgraph");
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

export async function saveGraph(cwd: string, graph: SkillGraph): Promise<void> {
  await mkdir(stateDirectory(cwd), { recursive: true });
  await writeFile(graphPath(cwd), `${JSON.stringify(graph, null, 2)}\n`, "utf8");
  await writeFile(edgesPath(cwd), `${JSON.stringify(graph.edges, null, 2)}\n`, "utf8");
}

export async function loadGraph(cwd: string): Promise<SkillGraph> {
  const raw = await readFile(graphPath(cwd), "utf8");
  return skillGraphSchema.parse(JSON.parse(raw));
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

export async function saveSkillsShSearchCache<T>(
  cwd: string,
  query: string,
  value: T,
): Promise<void> {
  const targetPath = skillsShCachePath(cwd, query);
  await mkdir(path.dirname(targetPath), { recursive: true });
  await writeFile(targetPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
