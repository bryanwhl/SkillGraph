# SkillGraph Resolver

SkillGraph Resolver is a proposed runtime layer for AI agents that turns flat skill libraries into graph-structured, progressively disclosed capability context.

Current agent skill systems usually work like this:

1. The agent sees a flat list of installed skill names and descriptions.
2. A matching skill is loaded when the model decides it is relevant.
3. Remote marketplace discovery is separate from the agent's immediate task context.

SkillGraph Resolver explores a different model:

1. Skills are indexed as typed graph nodes.
2. Nodes have relationships such as `requires`, `specializes`, `complements`, `conflicts_with`, and `supersedes`.
3. Each node exposes multiple context depths, from a short capability card to full `SKILL.md` content and referenced files.
4. During an agent task, the resolver returns the smallest useful skill subgraph, then lets the agent expand deeper only when the work requires it.

The goal is not to replace skills.sh, Claude Skills, Codex Skills, or local `SKILL.md` directories. The goal is to create a coordination layer that makes those ecosystems more useful at runtime.

## Status

This repository currently contains the product definition and design documents only. It intentionally does not include a first implementation yet.

## Core Documents

- [PRD.md](./PRD.md): End-to-end product requirements and strategy.
- [docs/architecture.md](./docs/architecture.md): Proposed system architecture and components.
- [docs/runtime-protocol.md](./docs/runtime-protocol.md): How an agent should use the graph during a task.
- [docs/graph-schema.md](./docs/graph-schema.md): Draft schema for nodes, edges, context layers, and provenance.
- [docs/marketplace-strategy.md](./docs/marketplace-strategy.md): How this complements skills.sh and existing skill marketplaces.
- [docs/roadmap.md](./docs/roadmap.md): MVP and future milestones.

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

## Working Name

The project name is intentionally descriptive. Candidate future names:

- SkillGraph
- SkillRouter
- SkillMap
- ContextGraph
- SkillWeaver

## License

MIT. See [LICENSE](./LICENSE).

