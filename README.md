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

The current launch scope is intentionally small: local skill indexing, local search, deterministic graph resolution, context expansion, last-resolution explanations, and a companion agent skill. Hosted sync, user accounts, telemetry, and automatic remote installs are out of scope for v0.1.

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

Search the indexed graph:

```bash
node dist/cli/index.js search "frontend design"
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

The demo indexes example skills, searches the graph, resolves a local frontend task, expands a full skill, explains the saved resolution, and shows the approval-required path for a remote accessibility skill.

## CLI Commands

- `skillgraph index`: scans skill roots and manual graph files, then writes `.skillgraph/index.json`.
- `skillgraph search "<query>"`: ranks local graph nodes with deterministic lexical scoring.
- `skillgraph resolve "<task>"`: returns selected nodes, depths, frontier nodes, conflicts, missing remote nodes, token estimates, and explanations.
- `skillgraph expand <node-id> --depth <depth>`: returns `l0`, `l1`, `l2`, `l3`, `l4`, `summary`, `capability_card`, or `full` context when available.
- `skillgraph explain --last`: renders the previous resolution from `.skillgraph/last-resolution.json`.
- `skillgraph install <node-id>`: v0.1 dry-run guidance for approval-required remote installs.

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
- Search ranking.
- Resolver planning, ancestors, frontier nodes, conflicts, and token budgets.
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

