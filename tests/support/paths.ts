import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
export const repoRoot = path.resolve(path.dirname(currentFile), "..", "..");
export const fixturesRoot = path.join(repoRoot, "tests", "fixtures");

export function fixturePath(...parts: string[]): string {
  return path.join(fixturesRoot, ...parts);
}
