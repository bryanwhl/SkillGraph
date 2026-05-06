# Technical Plan

This document defines the first launch-ready implementation plan for SkillGraph.

The first version should prove the product thesis with a local-first CLI and an agent skill. It should not require hosted infrastructure, user accounts, background sync, or automatic remote installs.

## Launch Goal

Build `skillgraph` as a local command-line tool that can:

- Index locally installed agent skills.
- Search indexed skills.
- Resolve a user task into a ranked skill context plan.
- Return selected skill nodes, context depths, frontier nodes, conflicts, missing skills, and explanations.
- Expand a selected node to deeper context, including full `SKILL.md` content.
- Save the last resolution for explainability.
- Provide a companion agent skill that teaches Codex, Claude Code, or similar runtimes how to use the CLI during a task.

The first useful launch should make this flow work:

```bash
skillgraph index
skillgraph search "frontend design"
skillgraph resolve "make this React dashboard production-ready" --format markdown
skillgraph expand frontend-design --depth full
skillgraph explain --last
```

## Product Boundary

Version `0.1` is local-first.

Included:

- Local skill indexing.
- Local graph store.
- Deterministic search and scoring.
- Manual and heuristic graph edges.
- Progressive context depths.
- JSON and Markdown output.
- A Codex/Claude-compatible agent skill.
- Dry-run display of remote install commands, if remote candidates are present.

Not included:

- Hosted graph website.
- Hosted skill index.
- User accounts.
- Cloud sync.
- Telemetry.
- Automatic remote installs.
- LLM-generated canonical edges.
- Full semantic codebase analysis.

## Recommended Technology Stack

Use TypeScript and Node.js for the first implementation.

Rationale:

- The skill ecosystem already uses local Markdown files, `npx`, GitHub repositories, and CLI workflows.
- Node.js gives straightforward cross-platform packaging for macOS, Linux, and Windows.
- TypeScript makes the schema and resolver contracts explicit.
- The project can ship as an npm package with a `bin` entry.

Recommended stack:

- Runtime: Node.js 20 or newer.
- Language: TypeScript.
- CLI framework: `commander`.
- Validation: `zod`.
- Markdown and frontmatter parsing: `gray-matter`.
- YAML parsing: `yaml`.
- Local search v0.1: deterministic lexical scorer.
- Local search v0.2: BM25 provider using `minisearch`.
- Semantic search v0.3+: optional embeddings provider behind the same retrieval interface.
- Tests: `vitest`.
- Package manager: `npm` unless the implementation chooses a workspace-oriented alternative.
- Initial graph store: JSON files under `.skillgraph/`.
- Later graph store option: SQLite, if search, migrations, or cache behavior outgrow JSON.

## Local State

The initial implementation should write project-local state by default:

```text
.skillgraph/
  index.json
  edges.json
  last-resolution.json
  cache/
```

`index.json` stores normalized skill nodes.

`edges.json` stores manual and heuristic graph edges.

`last-resolution.json` stores the latest resolver output for `skillgraph explain --last`.

`loaded-context.json` stores context layers expanded through `skillgraph expand`.

`cache/` stores fetched remote metadata in later phases.

## Proposed Source Layout

```text
src/
  cli/
    index.ts
    commands/
      index.ts
      search.ts
      resolve.ts
      expand.ts
      explain.ts
  adapters/
    local-codex.ts
    local-claude.ts
    skills-sh.ts
  graph/
    schema.ts
    builder.ts
    edges.ts
    store.ts
  resolver/
    retrieve.ts
    score.ts
    plan.ts
    explain.ts
  context/
    layers.ts
    token-estimate.ts
  install/
    installer.ts
    approval.ts
  agent-skill/
    SKILL.md
```

The `skills-sh` and install modules can start as stubs or dry-run adapters until remote discovery is implemented.

The current remote adapter shells out to the official Skills CLI:

```bash
npx skills find "<query>"
```

SkillGraph parses the CLI output, caches remote metadata under `.skillgraph/cache/`, converts candidates into remote graph nodes, and keeps install commands dry-run and approval-required.

## Core Data Model

Minimum viable skill node:

```ts
type SkillNode = {
  id: string;
  name: string;
  title?: string;
  description: string;
  source: {
    type: "local_codex" | "local_claude" | "skills_sh" | "github";
    path?: string;
    url?: string;
  };
  runtime: {
    compatible: string[];
  };
  status: {
    installed: boolean;
    localPath?: string;
  };
  tags: string[];
  capabilities: string[];
  contextLayers: {
    l0: ContextLayer;
    l1?: ContextLayer;
    l2?: ContextLayer;
    l3?: ContextLayer;
    l4?: ContextLayer[];
  };
  provenance: {
    indexedAt: string;
    adapter: string;
    confidence: number;
  };
};
```

Minimum viable edge:

```ts
type SkillEdge = {
  from: string;
  to: string;
  type:
    | "contains"
    | "requires"
    | "specializes"
    | "complements"
    | "conflicts_with"
    | "duplicates"
    | "supersedes"
    | "applies_to";
  confidence: number;
  source: "manual" | "heuristic";
};
```

## Resolver Behavior

The resolver should be deterministic for the first launch.

Given a task query, it should:

1. Search indexed nodes.
2. Score matches by name, description, tags, capabilities, runtime compatibility, local availability, and estimated token cost.
3. Add graph neighbors when useful:
   - ancestors and broad context at shallow depth;
   - direct matches at deeper depth;
   - complements as frontier or shallow candidates;
   - conflicts as warnings.
4. Assign context depth under a configurable budget.
5. Return selected nodes, frontier nodes, conflicts, missing nodes, and reasons.
6. Save the result for later explanation.

The first scoring system can be lexical. Embeddings and LLM-assisted relationship proposals should come after deterministic behavior is useful.

## Search Evolution Plan

Search should improve in phases so each retrieval upgrade can be measured against the current resolver behavior.

### v0.1: Deterministic Lexical Baseline

The launch version uses a deterministic lexical scorer over names, descriptions, tags, and capabilities.

This keeps the first resolver:

- offline;
- dependency-light;
- easy to explain;
- easy to test with small fixtures.

The baseline should remain available in tests so later retrieval providers can be compared against it.

### v0.1.1: Relevance Evaluation Harness

Before replacing the scorer, add fixtures that capture expected ranking behavior.

The harness should include:

- representative skill nodes;
- representative task queries;
- expected top results;
- expected ancestor and frontier behavior;
- expected remote missing-skill behavior;
- regression tests for ranking and resolver explanations.

This prevents BM25 or semantic search from feeling better only because it is more complex.

### v0.2: BM25 Lexical Retrieval

Add a `SearchProvider` abstraction and implement a BM25-backed provider, likely with MiniSearch.

Suggested searchable fields:

- `name`, highest boost;
- `tags`, high boost;
- `capabilities`, high boost;
- `description`, medium boost;
- `triggerPhrases`, medium boost when available;
- `source` metadata, low boost or filter-only.

BM25 should retrieve candidate nodes. SkillGraph-specific resolver behavior should remain separate:

- installed/local preference;
- graph ancestor expansion;
- prerequisite and complement handling;
- conflict detection;
- context depth assignment;
- missing remote skill explanation.

This keeps BM25 as retrieval, not as the whole product brain.

Current implementation status:

- `skillgraph search` defaults to BM25.
- `--strategy lexical` keeps the deterministic scorer available for comparison.
- Search results include provider provenance, matched fields, matched terms, and an explanation.
- Resolver-selected direct matches include `scoreProvider` so downstream tools can explain where the score came from.

### v0.3: Persistent and Unified Retrieval

Once BM25 works locally, persist or rebuild its index under `.skillgraph/`.

Remote candidates from skills.sh should be normalized into the same searchable document shape as local skills, while keeping install approval explicit.

The resolver should be able to rank:

- installed local skills;
- cached remote candidates;
- missing but installable skills.

### v0.4: Optional Semantic Retrieval

Add embeddings after BM25 is useful and measurable.

Embed:

- skill names;
- descriptions;
- tags;
- capabilities;
- operational summaries when available.

Store vectors locally with enough metadata to know when they are stale:

- provider;
- model;
- source hash;
- generated timestamp.

Human-in-the-loop approval is required before enabling any provider that uploads local task text, repository context, or private skill content.

### v0.5: Hybrid Retrieval

Combine BM25 and semantic results using a stable fusion strategy, such as reciprocal rank fusion.

Current implementation supports reciprocal rank fusion over BM25 and deterministic lexical retrieval via `--strategy hybrid`. Semantic results can join the same fusion path after an embedding provider is approved.

The hybrid retriever should:

- preserve exact lexical wins when the query clearly names a skill or domain;
- recover conceptual matches that lexical search misses;
- explain whether each candidate came from BM25, semantic retrieval, graph expansion, or a combination;
- remain optional for privacy-sensitive local-only workflows.

### v0.6: Semantic Edge Proposals

Use embeddings and LLM-assisted proposals to suggest graph edges only after retrieval quality is validated.

Candidate semantic edges must include:

- proposed edge type;
- confidence;
- provenance;
- explanation;
- review status.

They should not become canonical without human review.

## Context Depths

The first implementation should support:

- `l0`: name, description, source, tags.
- `l1`: capability card derived from metadata and the first useful description text.
- `l2`: operational summary, if present or generated deterministically.
- `l3`: full `SKILL.md`.
- `l4`: referenced files, scripts, examples, templates, or assets.

Current implementation:

- `l0`: metadata.
- `l1`: deterministic capability card.
- `l2`: deterministic operational summary.
- `l3`: full installed `SKILL.md` context.
- `l4`: linked local artifacts from safe relative Markdown links.

Budget downgrades prefer `l2` before falling back to `l1`.

## Build Slices

### Slice 1: Local Indexer

Build:

- Detect local skill paths.
- Parse `SKILL.md` files.
- Extract frontmatter, title, description, tags, runtime compatibility, and local path.
- Write normalized nodes to `.skillgraph/index.json`.

Human decisions:

- Which runtime paths are indexed by default.
- Whether bundled/vendor skills are indexed by default or only user-installed skills.

### Slice 2: Local Search

Build:

- `skillgraph search "<query>"`.
- Lexical ranking over names, descriptions, tags, and capabilities.
- Markdown and JSON output.
- Search provider boundary that can later support BM25, semantic, and hybrid retrieval.

Human decisions:

- Validate whether ranking feels useful across real tasks.

### Slice 3: Resolver

Build:

- `skillgraph resolve "<task>"`.
- Candidate retrieval.
- Context depth assignment.
- Frontier generation.
- Conflict warnings.
- Reasons for each selected node.
- `.skillgraph/last-resolution.json`.

Human decisions:

- Tune whether recommendations should be conservative or exploratory.

### Slice 4: Expand and Explain

Build:

- `skillgraph expand <node> --depth <depth>`.
- `skillgraph explain --last`.
- Full `SKILL.md` expansion for installed skills.
- Clear Markdown output for agent consumption.

Human decisions:

- Dogfood the output inside real Codex or Claude workflows.

### Slice 5: Agent Skill

Build:

- Create a `SKILL.md` that teaches an agent to:
  - call `skillgraph resolve` before specialized work;
  - load shallow context first;
  - expand nodes only when justified by task or repository evidence;
  - ask before remote installs;
  - summarize what was loaded.

Human decisions:

- Decide where and how to install the agent skill for regular use.

### Slice 6: Remote Discovery

Build:

- Add a `skills.sh` adapter through the official Skills CLI while no stable JSON API is documented.
- Represent remote candidates as `installed: false`.
- Show source URL, install command, trust indicators, and relevance reason.
- Keep install behavior dry-run by default.
- Support `skillgraph remote-cache "<query>"` for explicit discovery.
- Support `skillgraph index --skills-sh-query "<query>"` to include remote candidates in local graph search and resolution.
- Support `skillgraph install <node-id>` as graph-aware dry-run install guidance.

Human-in-the-loop required:

- Approval before remote skill installation.
- Trust decisions for remote sources.
- Confirmation before executing install commands.

## Hosting Decision

Hosting is not needed for the first launch.

Reasons:

- The core value is runtime context orchestration, not public browsing.
- Local-first behavior protects private repository context.
- A CLI can validate the core resolver loop faster than a hosted website.
- Hosted infrastructure introduces accounts, moderation, sync, trust policy, and privacy work before the main thesis is proven.

Potential later hosted surfaces:

- Public graph explorer.
- Skill relationship review UI.
- Recommended bundle pages.
- Public or organization graph overlays.
- Hosted remote index with local cache.

## Autonomous Agent Work

A coding agent can autonomously implement:

- CLI scaffolding.
- TypeScript project setup.
- Schema validation.
- Local skill adapters.
- Local graph store.
- Search and resolver scoring.
- Context layer extraction.
- Expand and explain commands.
- Tests and fixtures.
- Example graph files.
- Documentation.
- The first agent skill.
- Dry-run remote install display.

## Human-In-The-Loop Work

Human approval or review is required for:

- Installing remote skills.
- Running install commands from remote metadata.
- Choosing trust policy defaults.
- Reviewing inferred edges before they become canonical.
- Curating official bundles.
- Deciding whether vendor or bundled skills are indexed by default.
- Validating recommendation quality.
- Publishing npm packages or GitHub releases.
- Enabling any feature that uploads local repository or task context.

## Launch Criteria

Version `0.1` is launch-ready when:

- `skillgraph index` creates a valid local index.
- `skillgraph search` returns useful local skill matches.
- `skillgraph resolve` returns selected nodes, context depths, frontier nodes, conflicts, and explanations.
- `skillgraph expand` can return full installed skill context.
- `skillgraph explain --last` explains the previous resolution.
- Tests cover parsing, indexing, searching, resolving, and expansion.
- The README includes installation and quickstart instructions.
- The agent skill can guide Codex or Claude through the resolver loop.

## First Implementation Recommendation

Start with local-only indexing and resolution.

Do not begin with marketplace search. The central product bet is progressive context orchestration. If that works locally, remote discovery becomes an adapter. If it does not work locally, marketplace search only adds noise.
