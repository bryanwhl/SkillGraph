# Roadmap

## Phase 0: Product Definition

Status: current repository state.

- Define PRD.
- Define graph concepts.
- Define runtime protocol.
- Define draft schema.
- Decide MVP scope.

## Phase 1: Local Prototype

Goal: prove that graph-based progressive disclosure improves agent skill usage.

Scope:

- Index local Codex skills.
- Parse `SKILL.md` frontmatter.
- Create manual graph edges for a few domains.
- Resolve task to selected nodes and context depths.
- Expand a node to deeper context.
- Produce explanations.

Success criteria:

- A user can run `skillgraph resolve "make this frontend polished"`.
- Resolver returns a useful plan with ancestors, candidate skills, and frontier nodes.
- Agent can read selected context without installing anything new.

## Phase 2: skills.sh Adapter

Goal: connect remote discovery to runtime graph resolution.

Scope:

- Search skills.sh.
- Fetch skill metadata.
- Link install commands.
- Mark local vs remote skills.
- Ask before installation.
- Read newly installed `SKILL.md` files immediately.

Success criteria:

- Resolver can propose remote skills with clear trust metadata.
- User can approve install.
- Agent can use the new skill in the same turn.

## Phase 3: Progressive Context Layers

Goal: formalize depth-based loading.

Scope:

- Generate capability cards.
- Generate operational summaries.
- Estimate token cost.
- Track loaded layers.
- Avoid duplicate context.

Success criteria:

- Resolver can stay under a token budget.
- Agent can expand deeper nodes only when needed.

## Phase 4: Edge Inference

Goal: reduce manual graph authoring.

Scope:

- Generate candidate edges using embeddings.
- Propose semantic edges with an LLM.
- Attach confidence and provenance.
- Add review workflow.

Success criteria:

- Inferred edges are useful but not silently canonical.
- Users can inspect why an edge exists.

## Phase 5: Agent Runtime Skills

Goal: support multiple agent environments.

Scope:

- Codex skill.
- Claude Code skill.
- Runtime-specific install adapters.
- Export graph plans as Markdown and JSON.

Success criteria:

- Same graph can guide both Codex and Claude workflows.

## Phase 6: Hosted Graph Explorer

Goal: make the graph browsable and reviewable.

Scope:

- Website with tree-like domain views.
- Node pages.
- Relationship visualization.
- Bundle pages.
- Contribution workflow.

Success criteria:

- Users can discover and understand skill relationships before using the CLI.

## Phase 7: Team and Organization Support

Goal: make SkillGraph useful for teams.

Scope:

- Organization graph overlays.
- Allowlists and denylists.
- Recommended bundles.
- Private skill sources.
- Policy-driven installs.

Success criteria:

- Teams can standardize agent workflows without forcing every user to manually curate skills.

