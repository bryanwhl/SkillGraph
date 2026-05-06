import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { buildOperationalSummary } from "../context/operational-summary.js";
import { estimateTokens } from "../context/token-estimate.js";
import { type SkillNode, skillNodeSchema } from "../graph/schema.js";
import { slugify, tokenize, unique } from "../shared/strings.js";

const execFileAsync = promisify(execFile);

export type SkillsShSearchResult = {
  id: string;
  name: string;
  repository: string;
  locator: string;
  url: string;
  installCount?: number;
  installCommand: string;
};

export type SkillsShRunner = (args: string[]) => Promise<string>;

export type SearchSkillsShOptions = {
  limit?: number;
  runner?: SkillsShRunner;
};

export type SkillsShNodeOptions = {
  indexedAt: string;
  query: string;
};

export async function searchSkillsSh(
  query: string,
  options: SearchSkillsShOptions = {},
): Promise<SkillsShSearchResult[]> {
  const runner = options.runner ?? runSkillsCli;
  const output = await runner(["skills", "find", query]);
  return parseSkillsShFindOutput(output).slice(0, options.limit ?? 10);
}

export function parseSkillsShFindOutput(output: string): SkillsShSearchResult[] {
  const lines = output
    .split(/\r?\n/)
    .map((line) => stripAnsi(line).trim())
    .filter(Boolean);
  const results: SkillsShSearchResult[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const match = line.match(
      /^([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)@([A-Za-z0-9_.-]+)\s+([0-9]+(?:\.[0-9]+)?)([KMB])?\s+installs?$/i,
    );

    if (!match) {
      continue;
    }

    const [, repository, name, count, suffix] = match;
    if (!repository || !name || !count) {
      continue;
    }

    const url = findUrl(lines[index + 1] ?? "");
    if (!url) {
      continue;
    }

    results.push({
      id: slugify(name),
      name,
      repository,
      locator: `${repository}@${name}`,
      url,
      installCount: parseInstallCount(count, suffix),
      installCommand: `npx skills add ${repository} --skill ${name}`,
    });
  }

  return results;
}

export function skillsShResultToNode(
  result: SkillsShSearchResult,
  options: SkillsShNodeOptions,
): SkillNode {
  const queryTags = tokenize(options.query);
  const tags = unique([...queryTags, "remote", "skills-sh"]).sort();
  const capability = result.name.replace(/[-_]+/g, " ");
  const installs = result.installCount
    ? `${result.installCount.toLocaleString("en-US")} installs`
    : "install count unavailable";
  const description = `Remote skills.sh candidate ${result.name} from ${result.repository}, found for "${options.query}" with ${installs}.`;
  const l1Content = [
    `# ${result.name}`,
    "",
    description,
    "",
    `Source: ${result.url}`,
    `Install after human approval: \`${result.installCommand}\``,
  ].join("\n");
  const l2Content = buildOperationalSummary({
    title: result.name,
    description,
    tags,
    capabilities: [capability],
    source: result.url,
    installCommand: result.installCommand,
  });

  return skillNodeSchema.parse({
    id: result.id,
    name: result.name,
    title: result.name,
    kind: "skill",
    description,
    source: {
      type: "skills_sh",
      url: result.url,
      repository: result.repository,
    },
    runtime: {
      compatible: ["codex", "claude"],
    },
    status: {
      installed: false,
    },
    tags,
    capabilities: unique([capability, ...tokenize(result.name)]).sort(),
    contextLayers: {
      l0: {
        depth: "l0",
        label: "metadata",
        tokenEstimate: estimateTokens(description),
        content: description,
      },
      l1: {
        depth: "l1",
        label: "remote capability card",
        tokenEstimate: estimateTokens(l1Content),
        content: l1Content,
      },
      l2: {
        depth: "l2",
        label: "operational summary",
        tokenEstimate: estimateTokens(l2Content),
        content: l2Content,
      },
    },
    provenance: {
      indexedAt: options.indexedAt,
      adapter: "skills_sh",
      confidence: 0.7,
    },
  });
}

async function runSkillsCli(args: string[]): Promise<string> {
  const executable = process.platform === "win32" ? "npx.cmd" : "npx";
  const { stdout } = await execFileAsync(executable, args, {
    env: {
      ...process.env,
      NO_COLOR: "1",
      FORCE_COLOR: "0",
      DISABLE_TELEMETRY: "1",
      SKILLS_NO_TELEMETRY: "1",
    },
    windowsHide: true,
  });
  return stdout;
}

function stripAnsi(input: string): string {
  return input.replace(
    // eslint-disable-next-line no-control-regex
    /\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g,
    "",
  );
}

function findUrl(input: string): string | undefined {
  return input.match(/https?:\/\/\S+/)?.[0];
}

function parseInstallCount(count: string, suffix: string | undefined): number {
  const multiplier =
    suffix?.toUpperCase() === "B"
      ? 1_000_000_000
      : suffix?.toUpperCase() === "M"
        ? 1_000_000
        : suffix?.toUpperCase() === "K"
          ? 1_000
          : 1;
  return Math.round(Number.parseFloat(count) * multiplier);
}
