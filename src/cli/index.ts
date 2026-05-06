#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { Command } from "commander";
import {
  parseSkillsShFindOutput,
  searchSkillsSh,
  skillsShResultToNode,
} from "../adapters/skills-sh.js";
import { expandNode, type ExpandDepth } from "../resolver/expand.js";
import { explainResolution, resolveTask } from "../resolver/plan.js";
import {
  SEARCH_PROVIDER_NAMES,
  type SearchProviderName,
  searchSkills,
} from "../resolver/retrieve.js";
import { indexSkills } from "../graph/builder.js";
import {
  appendLoadedContext,
  loadGraph,
  loadLastResolution,
  loadLoadedContext,
  saveGraph,
  saveLastResolution,
  saveSkillsShSearchCache,
  skillsShCachePath,
} from "../graph/store.js";
import { type SkillNode } from "../graph/schema.js";
import {
  formatLoadedContextMarkdown,
  formatIndexSummary,
  formatResolutionMarkdown,
  formatSearchMarkdown,
  formatSkillsShSearchMarkdown,
} from "../format/markdown.js";
import { collectOption, runtimeOptions } from "./options.js";

const program = new Command();

program
  .name("skillgraph")
  .description("Local-first skill graph resolver for AI agent skills")
  .version("0.2.0")
  .option("--cwd <path>", "workspace directory")
  .option("--skill-root <path>", "skill root to index", collectOption, [])
  .option("--graph <path>", "manual skillgraph YAML file", collectOption, []);

program
  .command("index")
  .description("Index local skills and manual graph files")
  .option("--format <format>", "json or markdown", "markdown")
  .option("--skills-sh-query <query>", "skills.sh query to cache as remote candidates", collectOption, [])
  .option("--remote-limit <number>", "remote candidate count per skills.sh query", parseInteger, 5)
  .action(async (options: {
    format: string;
    skillsShQuery: string[];
    remoteLimit: number;
  }) => {
    const runtime = runtimeOptions(program.opts());
    const indexedAt = new Date().toISOString();
    const remoteNodes = await remoteNodesForQueries(
      runtime.cwd,
      options.skillsShQuery,
      options.remoteLimit,
      indexedAt,
    );
    const graph = await indexSkills({
      ...runtime,
      remoteNodes,
      now: indexedAt,
    });
    await saveGraph(runtime.cwd, graph);
    writeOutput(
      options.format,
      graph,
      () => formatIndexSummary(graph),
    );
  });

program
  .command("remote-cache")
  .description("Search skills.sh through the Skills CLI and cache remote candidates")
  .argument("<query>", "skills.sh search query")
  .option("--format <format>", "json or markdown", "markdown")
  .option("--limit <number>", "maximum remote result count", parseInteger, 10)
  .option("--fixture <path>", "parse a saved Skills CLI output fixture instead of running npx")
  .action(async (
    query: string,
    options: { format: string; limit: number; fixture?: string },
  ) => {
    const runtime = runtimeOptions(program.opts());
    const results = options.fixture
      ? parseSkillsShFindOutput(await readFile(options.fixture, "utf8")).slice(0, options.limit)
      : await searchSkillsSh(query, { limit: options.limit });
    await saveSkillsShSearchCache(runtime.cwd, query, {
      query,
      results,
      cachedAt: new Date().toISOString(),
    });
    writeOutput(
      options.format,
      {
        query,
        cachePath: skillsShCachePath(runtime.cwd, query),
        results,
      },
      () => formatSkillsShSearchMarkdown(results),
    );
  });

program
  .command("search")
  .description("Search indexed skills")
  .argument("<query>", "search query")
  .option("--format <format>", "json or markdown", "markdown")
  .option("--limit <number>", "maximum result count", parseInteger, 10)
  .option("--strategy <strategy>", "search strategy: bm25 or lexical", "bm25")
  .action(async (
    query: string,
    options: { format: string; limit: number; strategy: string },
  ) => {
    const runtime = runtimeOptions(program.opts());
    const graph = await loadGraph(runtime.cwd);
    const results = searchSkills(graph, query, {
      limit: options.limit,
      provider: parseSearchProvider(options.strategy),
    });
    writeOutput(
      options.format,
      { query, strategy: parseSearchProvider(options.strategy), results },
      () => formatSearchMarkdown(results),
    );
  });

program
  .command("resolve")
  .description("Resolve a task into a budget-aware skill context plan")
  .argument("<task>", "task to resolve")
  .option("--agent <agent>", "agent runtime", "codex")
  .option("--budget <tokens>", "token budget", parseInteger, 4000)
  .option("--format <format>", "json or markdown", "markdown")
  .option("--strategy <strategy>", "search strategy: bm25 or lexical", "bm25")
  .action(
    async (
      task: string,
      options: { agent: string; budget: number; format: string; strategy: string },
    ) => {
      const runtime = runtimeOptions(program.opts());
      const graph = await loadGraph(runtime.cwd);
      const resolution = resolveTask(graph, {
        task,
        agent: options.agent,
        budgetTokens: options.budget,
        searchProvider: parseSearchProvider(options.strategy),
      });
      await saveLastResolution(runtime.cwd, resolution);
      writeOutput(
        options.format,
        resolution,
        () => formatResolutionMarkdown(resolution),
      );
    },
  );

program
  .command("expand")
  .description("Expand one node to a requested context depth")
  .argument("<node>", "node id")
  .option("--depth <depth>", "l0, l1, l2, l3, l4, full, summary, capability_card", "l1")
  .option("--format <format>", "json or markdown", "markdown")
  .action(async (node: string, options: { depth: ExpandDepth; format: string }) => {
    const runtime = runtimeOptions(program.opts());
    const graph = await loadGraph(runtime.cwd);
    const expanded = await expandNode(graph, node, options.depth);
    await appendLoadedContext(runtime.cwd, {
      node: expanded.node,
      depth: expanded.depth,
      label: expanded.label,
      tokenEstimate: expanded.tokenEstimate,
      loadedAt: new Date().toISOString(),
    });
    writeOutput(options.format, expanded, () => `${expanded.content}\n`);
  });

program
  .command("context")
  .description("Show context layers expanded in this workspace")
  .option("--format <format>", "json or markdown", "markdown")
  .action(async (options: { format: string }) => {
    const runtime = runtimeOptions(program.opts());
    const loaded = await loadLoadedContext(runtime.cwd);
    writeOutput(
      options.format,
      { loaded },
      () => formatLoadedContextMarkdown(loaded),
    );
  });

program
  .command("explain")
  .description("Explain the last resolution")
  .option("--last", "explain the last saved resolution", true)
  .option("--format <format>", "json or markdown", "markdown")
  .action(async (options: { format: string }) => {
    const runtime = runtimeOptions(program.opts());
    const resolution = await loadLastResolution(runtime.cwd);
    writeOutput(options.format, resolution, () => explainResolution(resolution));
  });

program
  .command("install")
  .description("Show a safe, approval-required install plan for a missing remote skill")
  .argument("<node>", "node id")
  .action(async (nodeId: string) => {
    const runtime = runtimeOptions(program.opts());
    const graph = await loadGraph(runtime.cwd);
    const node = graph.nodes.find((candidate) => candidate.id === nodeId);
    if (!node) {
      throw new Error(`Unknown node: ${nodeId}`);
    }

    if (node.status.installed) {
      process.stdout.write(
        [
          `${node.id} is already installed locally.`,
          node.status.localPath ? `Path: ${node.status.localPath}` : "",
          "",
        ]
          .filter(Boolean)
          .join("\n"),
      );
      return;
    }

    const command = installCommandFor(node);
    process.stdout.write(
      [
        `Remote installation for ${node.id} is dry-run only; approval required.`,
        node.source.url ? `Source: ${node.source.url}` : "",
        command ? `Install after approval: \`${command}\`` : "No install command is available for this node.",
        "",
      ]
        .filter(Boolean)
        .join("\n"),
    );
  });

program.parseAsync().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});

function parseInteger(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Expected integer, received ${value}`);
  }
  return parsed;
}

function parseSearchProvider(value: string): SearchProviderName {
  if ((SEARCH_PROVIDER_NAMES as readonly string[]).includes(value)) {
    return value as SearchProviderName;
  }
  throw new Error(
    `Expected search strategy to be one of ${SEARCH_PROVIDER_NAMES.join(", ")}, received ${value}`,
  );
}

function installCommandFor(node: SkillNode): string | undefined {
  if (node.source.repository) {
    return `npx skills add ${node.source.repository} --skill ${node.name}`;
  }
  if (node.source.url) {
    return `npx skills add ${node.source.url} --skill ${node.name}`;
  }
  return undefined;
}

async function remoteNodesForQueries(
  cwd: string,
  queries: string[],
  limit: number,
  indexedAt: string,
): Promise<SkillNode[]> {
  const nodes: SkillNode[] = [];

  for (const query of queries) {
    const results = await searchSkillsSh(query, { limit });
    await saveSkillsShSearchCache(cwd, query, {
      query,
      results,
      cachedAt: indexedAt,
    });
    nodes.push(
      ...results.map((result) =>
        skillsShResultToNode(result, {
          indexedAt,
          query,
        }),
      ),
    );
  }

  return nodes;
}

function writeOutput<T>(
  format: string,
  value: T,
  markdown: () => string,
): void {
  if (format === "json") {
    process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
    return;
  }
  process.stdout.write(markdown());
}
