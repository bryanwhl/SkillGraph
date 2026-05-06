# SkillGraph

SkillGraph is a proposed runtime layer for AI agents that turns flat skill libraries into graph-structured, progressively disclosed capability context.

Current agent skill systems usually work like this:

1. The agent sees a flat list of installed skill names and descriptions.
2. A matching skill is loaded when the model decides it is relevant.
3. Remote marketplace discovery is separate from the agent's immediate task context.

SkillGraph explores a different model:

1. Skills are indexed as typed graph nodes.
2. Nodes have relationships such as `requires`, `specializes`, `complements`, `conflicts_with`, and `supersedes`.
3. Each node exposes multiple context depths, from a short capability card to full `SKILL.md` content and referenced files.
4. During an agent task, the resolver returns the smallest useful skill subgraph, then lets the agent expand deeper only when the work requires it.

The goal is not to replace skills.sh, Claude Skills, Codex Skills, or local `SKILL.md` directories. The goal is to create a coordination layer that makes those ecosystems more useful at runtime.

## Status

This repository now includes the first local-first CLI implementation for SkillGraph.

The current launch scope is intentionally small: local skill indexing, BM25 local search with deterministic lexical and optional semantic providers, deterministic graph resolution, context expansion, last-resolution explanations, and a companion agent skill. Hosted sync, user accounts, telemetry, remote embedding uploads, and automatic remote installs are out of scope for the current local-first version.

## Quickstart

Install dependencies and build the CLI:

```bash
npm install
npm run build
```

Index local project and user skills:

```bash
node dist/cli/index.js index
```

Optionally build a local semantic embedding index:

```bash
node dist/cli/index.js embeddings index --provider qwen3-local
```

The real semantic provider runs locally through Python and `sentence-transformers` with `Qwen/Qwen3-Embedding-0.6B` by default. Tests and demos use a deterministic provider instead so verification does not require model weights:

```bash
node dist/cli/index.js embeddings index --provider deterministic
```

If skill text changes after embeddings are built, semantic search will ask you to rebuild the local embedding index.

Search the indexed graph:

```bash
node dist/cli/index.js search "frontend design"
```

Compare against the deterministic lexical baseline:

```bash
node dist/cli/index.js search "frontend design" --strategy lexical
```

Fuse BM25 and lexical rankings:

```bash
node dist/cli/index.js search "frontend design" --strategy hybrid
```

Search with semantic similarity after embeddings are indexed:

```bash
node dist/cli/index.js search "visual screenshots review" --strategy semantic
```

Suggest inferred graph edges for human review:

```bash
node dist/cli/index.js edges suggest
```

Cache remote skills.sh candidates without installing them:

```bash
node dist/cli/index.js remote-cache "accessibility keyboard"
```

Index local skills plus remote candidates from skills.sh:

```bash
node dist/cli/index.js index --skills-sh-query "accessibility keyboard"
```

Resolve a task into a skill context plan:

```bash
node dist/cli/index.js resolve "make this React dashboard production-ready"
```

Expand a selected node to full skill context:

```bash
node dist/cli/index.js expand frontend-design --depth full
```

Explain the last resolution:

```bash
node dist/cli/index.js explain --last
```

During local development, the same commands can be run through `tsx`:

```bash
npm run dev -- index
npm run dev -- resolve "make this CLI production-ready"
```

Run the built-in demo:

```bash
npm run demo
```

The demo indexes example skills, builds deterministic demo embeddings, suggests review-required inferred edges, searches the graph with BM25, lexical, semantic, and hybrid retrieval, caches remote candidates, resolves a local frontend task, expands summary, full, and linked artifact context, explains the saved resolution, and shows the approval-required path for a remote accessibility skill.

## CLI Commands

- `skillgraph index`: scans skill roots and manual graph files, then writes `.skillgraph/index.json`.
- `skillgraph index --skills-sh-query "<query>"`: includes cached, not-installed skills.sh candidates as remote graph nodes.
- `skillgraph remote-cache "<query>"`: searches skills.sh through the official Skills CLI, caches metadata under `.skillgraph/cache/`, and prints approval-required install commands.
- `skillgraph embeddings index`: builds `.skillgraph/embeddings.json`; default provider is local Qwen3, and `--provider deterministic` is available for tests and demos.
- `skillgraph embeddings info`: shows saved semantic index provider, model, dimensions, and vector count.
- `skillgraph edges suggest`: proposes embedding-similarity graph edges with `reviewStatus: proposed`; it does not mutate canonical graph edges.
- `skillgraph search "<query>"`: ranks graph nodes with BM25 by default; pass `--strategy lexical` to compare against the deterministic baseline, `--strategy semantic` to use the saved embedding index, or `--strategy hybrid` to fuse BM25, lexical, and semantic rankings when embeddings exist.
- `skillgraph resolve "<task>"`: returns selected nodes, depths, frontier nodes, conflicts, missing remote nodes, token estimates, scoring provider provenance, and explanations.
- `skillgraph expand <node-id> --depth <depth>`: returns `l0`, `l1`, `l2`, `l3`, `l4`, `summary`, `capability_card`, or `full` context when available. `summary` maps to the deterministic `l2` operational summary.
- `skillgraph context`: shows context layers expanded in the current workspace.
- `skillgraph explain --last`: renders the previous resolution from `.skillgraph/last-resolution.json`.
- `skillgraph install <node-id>`: graph-aware dry-run guidance with the exact approval-required remote install command when available.

## Development

Run the verification suite:

```bash
npm test
npm run typecheck
npm run build
npm run demo
```

The test suite covers:

- `SKILL.md` parsing and normalization.
- Local skill indexing with manual graph overlays.
- BM25 and deterministic lexical search ranking.
- Deterministic semantic embedding indexing and search.
- Review-required inferred edge suggestions from embedding similarity.
- Hybrid BM25, lexical, and semantic reciprocal rank fusion.
- skills.sh CLI output parsing and remote candidate normalization.
- Retrieval relevance regression fixtures.
- Resolver planning, ancestors, frontier nodes, conflicts, and token budgets.
- Progressive context summaries and budget downgrades.
- Linked local artifact expansion through `l4`.
- Loaded context tracking.
- Approval-required install plan output.
- Context expansion.
- End-to-end CLI behavior over fixture skills.

## Core Documents

- [PRD.md](./PRD.md): End-to-end product requirements and strategy.
- [docs/architecture.md](./docs/architecture.md): Proposed system architecture and components.
- [docs/runtime-protocol.md](./docs/runtime-protocol.md): How an agent should use the graph during a task.
- [docs/graph-schema.md](./docs/graph-schema.md): Draft schema for nodes, edges, context layers, and provenance.
- [docs/technical-plan.md](./docs/technical-plan.md): Launch-ready implementation plan, stack, hosting decision, and human-in-the-loop boundaries.
- [docs/marketplace-strategy.md](./docs/marketplace-strategy.md): How this complements skills.sh and existing skill marketplaces.
- [docs/roadmap.md](./docs/roadmap.md): MVP and future milestones.

## Project Skills

This repository vendors project-level agent skills under [.agents/skills](./.agents/skills) so future agent sessions can use the same build-support workflows while developing SkillGraph.

Current project skills:

- `find-skills`
- `test-driven-development`
- `verification-before-completion`
- `typescript-advanced-types`
- `nodejs-backend-patterns`

The selected skill sources and hashes are tracked in [skills-lock.json](./skills-lock.json).

## Product Thesis

Agent skills should behave less like a flat plugin list and more like a contextual knowledge graph. A skill graph can help an agent answer questions such as:

- What broad capability area am I in?
- Which installed skills are relevant?
- Which remote skills might improve the task?
- What prerequisite context should I load first?
- Which deeper skill nodes should I expand only after seeing the repository and task details?
- What skill conflicts or overlaps should I avoid?

## Non-Goals for the First Version

- Building a new agent runtime.
- Replacing skills.sh.
- Automatically installing untrusted remote skills without user approval.
- Forcing every skill into a strict tree.
- Requiring agent vendors to change their native skill loading behavior.

## License

MIT. See [LICENSE](./LICENSE).

