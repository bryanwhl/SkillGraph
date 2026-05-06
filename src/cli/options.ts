import os from "node:os";
import path from "node:path";

export type RuntimeOptions = {
  cwd: string;
  skillRoots: string[];
  graphFiles: string[];
};

export function defaultSkillRoots(cwd: string): string[] {
  const roots = [
    path.join(cwd, ".agents", "skills"),
    path.join(os.homedir(), ".codex", "skills"),
    path.join(os.homedir(), ".claude", "skills"),
  ];
  const codexHome = process.env.CODEX_HOME;
  if (codexHome) {
    roots.push(path.join(codexHome, "skills"));
  }
  return [...new Set(roots.map((root) => path.resolve(root)))];
}

export function defaultGraphFiles(cwd: string): string[] {
  return [path.join(cwd, "skill-graph.yaml"), path.join(cwd, "examples", "skill-graph.yaml")];
}

export function collectOption(value: string, previous: string[] = []): string[] {
  return [...previous, value];
}

export function runtimeOptions(raw: {
  cwd?: string;
  skillRoot?: string[];
  graph?: string[];
}): RuntimeOptions {
  const cwd = path.resolve(raw.cwd ?? process.cwd());
  return {
    cwd,
    skillRoots:
      raw.skillRoot && raw.skillRoot.length > 0
        ? raw.skillRoot.map((root) => path.resolve(root))
        : defaultSkillRoots(cwd),
    graphFiles:
      raw.graph && raw.graph.length > 0
        ? raw.graph.map((graph) => path.resolve(graph))
        : defaultGraphFiles(cwd),
  };
}
