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

## Phase 1.5: Search Quality Foundation

Goal: make retrieval quality measurable before replacing the first deterministic scorer.

Scope:

- Add relevance fixtures with representative skills and task queries.
- Capture expected top results, ancestor expansion, frontier nodes, and missing-skill behavior.
- Keep the current deterministic lexical search as the baseline.
- Define the `SearchProvider` interface so lexical, BM25, semantic, and hybrid retrieval can be swapped without changing resolver behavior.

Success criteria:

- Search and resolver ranking changes can be tested against stable relevance expectations.
- Regression tests explain when a new retrieval strategy improves or harms the current behavior.
- The resolver can consume candidates from a provider abstraction instead of depending on one scoring implementation.

## Phase 1.6: BM25 Local Search

Goal: improve local lexical ranking while keeping search explainable and offline.

Scope:

- Add a BM25-backed local search provider, likely using MiniSearch.
- Index skill name, description, tags, capabilities, trigger phrases, and source metadata.
- Apply field boosts, with names and tags weighted above descriptions.
- Preserve SkillGraph-specific post-processing for installed status, graph neighbors, conflicts, context depth, and explanation.
- Persist or rebuild the local search index under `.skillgraph/` as appropriate for CLI performance.

Success criteria:

- Exact skill-name, tag, and capability matches rank predictably.
- Multi-term task queries produce better rankings than the v0.1 deterministic lexical scorer.
- BM25 behavior is covered by unit tests and relevance regression tests.
- No hosted service or API key is required.

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

## Phase 2.5: Unified Local and Remote Retrieval

Goal: make local and remote skills participate in the same retrieval pipeline.

Scope:

- Normalize remote skills.sh candidates into the same searchable document shape as local skills.
- Run BM25 across local nodes and cached remote candidates where metadata is available.
- Keep remote install behavior approval-gated and dry-run by default.
- Track source trust, install command, and cache freshness in retrieval results.

Success criteria:

- Search can rank installed and remote candidates together while clearly labeling source and trust metadata.
- Resolver can recommend remote skills without treating them as installed context.
- The same relevance tests can cover local-only and local-plus-remote retrieval.

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

## Phase 4: Semantic and Hybrid Retrieval

Goal: add semantic matching without losing deterministic, explainable behavior.

Scope:

- Add optional embedding generation for skill names, descriptions, tags, capabilities, and operational summaries.
- Store embedding metadata locally first, with provider, model, timestamp, and source hash.
- Add a semantic search provider that can retrieve conceptually related skills.
- Combine BM25 and semantic results with a stable fusion strategy such as reciprocal rank fusion.
- Rerank candidates with graph distance, installed status, source trust, and task fit.
- Require human review for provider choice, API key usage, cost, and any feature that uploads local task or repository context.

Success criteria:

- Semantic retrieval finds useful skills that BM25 misses.
- Exact lexical matches remain strong when they are clearly relevant.
- Hybrid rankings are covered by relevance tests and explain how each candidate was retrieved.
- Semantic search can be disabled for local-only or privacy-sensitive workflows.

## Phase 4.5: Edge Inference

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

