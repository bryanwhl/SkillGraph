import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const cli = path.join(repoRoot, "dist", "cli", "index.js");
const demoRoot = path.join(repoRoot, "examples", "demo");
const workspace = mkdtempSync(path.join(tmpdir(), "skillgraph-demo-"));

const baseArgs = [
  cli,
  "--cwd",
  workspace,
  "--skill-root",
  path.join(demoRoot, "skills"),
  "--graph",
  path.join(demoRoot, "skillgraph.yaml"),
];

try {
  section("Index demo skills");
  run([...baseArgs, "index"]);

  section("Search for frontend polish skills");
  run([...baseArgs, "search", "React frontend polish", "--limit", "4"]);

  section("Resolve a local frontend task");
  run([
    ...baseArgs,
    "resolve",
    "Make this dashboard polished and production-ready",
    "--budget",
    "1800",
  ]);

  section("Expand the selected frontend-design skill");
  run([...baseArgs, "expand", "frontend-design", "--depth", "full"]);

  section("Explain the last resolution");
  run([...baseArgs, "explain", "--last"]);

  section("Resolve a remote accessibility skill");
  run([
    ...baseArgs,
    "resolve",
    "Review this dashboard for accessibility and keyboard support",
    "--format",
    "markdown",
    "--budget",
    "1200",
  ]);
} finally {
  rmSync(workspace, { recursive: true, force: true });
}

function section(title) {
  process.stdout.write(`\n=== ${title} ===\n`);
}

function run(args) {
  process.stdout.write(`$ node ${relativeCommand(args)}\n`);
  const result = spawnSync(process.execPath, args, {
    cwd: repoRoot,
    encoding: "utf8",
  });

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function relativeCommand(args) {
  return args
    .map((arg) => {
      if (arg.startsWith(repoRoot)) {
        return path.relative(repoRoot, arg);
      }
      if (arg.startsWith(workspace)) {
        return path.relative(repoRoot, arg);
      }
      return arg;
    })
    .join(" ");
}
