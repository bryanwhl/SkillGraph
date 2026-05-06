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

- A user can run `skill-graph resolve "make this frontend polished"`.
- Resolver returns a useful plan with ancestors, candidate skills, and frontier nodes.
- Agent can read selected context without installing anything new.

## Phase 1.5: Search Quality Foundation

Status: implemented.

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

Status: implemented for local graph search.

Goal: improve local lexical ranking while keeping search explainable and offline.

Scope:

- Add a BM25-backed local search provider, likely using MiniSearch.
- Index skill name, description, tags, capabilities, trigger phrases, and source metadata.
- Apply field boosts, with names and tags weighted above descriptions.
- Preserve skill-graph-specific post-processing for installed status, graph neighbors, conflicts, context depth, and explanation.
- Persist or rebuild the local search index under `.skill-graph/` as appropriate for CLI performance.

Success criteria:

- Exact skill-name, tag, and capability matches rank predictably.
- Multi-term task queries produce better rankings than the v0.1 deterministic lexical scorer.
- BM25 behavior is covered by unit tests and relevance regression tests.
- No hosted service or API key is required.

## Phase 2: skills.sh Adapter

Status: partially implemented for dry-run discovery and cacheable remote metadata.

Goal: connect remote discovery to runtime graph resolution.

Scope:

- Search skills.sh through the official Skills CLI.
- Fetch and cache skill metadata exposed by `skills find` output.
- Link install commands.
- Mark local vs remote skills.
- Ask before installation.
- Read newly installed `SKILL.md` files immediately.

Success criteria:

- Resolver can propose cached remote skills with clear source metadata.
- User can approve install.
- Agent can use the new skill in the same turn.

Remaining work:

- Read newly installed `SKILL.md` files immediately after approved install.
- Enrich remote metadata when skills.sh exposes a stable structured API.
- Add source reputation and trust signals beyond install count and repository locator.

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

Status: implemented for deterministic `l2` operational summaries, linked local `l4` artifacts, loaded-context tracking, and budget-aware downgrades.

Goal: formalize depth-based loading.

Scope:

- Generate capability cards.
- Generate deterministic operational summaries.
- Estimate token cost.
- Track loaded layers.
- Avoid duplicate context.

Success criteria:

- Resolver can stay under a token budget.
- Agent can expand deeper nodes only when needed.

Remaining work:

- Track loaded layers across multi-step agent sessions.
- Expand `l4` artifact extraction beyond Markdown links if skills adopt explicit artifact metadata.

## Phase 4: Semantic and Hybrid Retrieval

Status: implemented for local optional semantic embeddings, deterministic semantic tests, Qwen3-local provider wiring, and BM25 plus lexical plus semantic hybrid fusion. Remote embedding providers remain gated on privacy and approval decisions.

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

Current implementation:

- `skill-graph embeddings index` builds `.skill-graph/embeddings.json`.
- `qwen3-local` is the default real local embedding provider and uses `Qwen/Qwen3-Embedding-0.6B` through `sentence-transformers`.
- `deterministic` is a test and demo provider that avoids model downloads.
- Model repository code execution is disabled unless the user explicitly passes `--trust-remote-code`.
- `skill-graph search --strategy semantic` ranks saved vectors by cosine similarity.
- `skill-graph search --strategy hybrid` fuses BM25, lexical, and semantic results when embeddings exist.
- Saved embeddings are checked against current normalized node text; direct semantic search asks for a rebuild when stale, while hybrid skips stale semantic results.
- No remote embedding upload path is implemented.

Remaining work:

- Add model installation documentation and hardware notes after dogfooding on common developer machines.
- Add semantic relevance fixtures that demonstrate conceptual matches BM25 misses.
- Evaluate smaller and larger embedding model choices against skill-graph-specific relevance fixtures.

## Phase 4.5: Edge Inference

Status: implemented for embedding-similarity suggestions that require human review before becoming canonical graph edges.

Goal: reduce manual graph authoring.

Scope:

- Generate candidate edges using embeddings.
- Propose semantic edges with an LLM.
- Attach confidence and provenance.
- Add review workflow.

Success criteria:

- Inferred edges are useful but not silently canonical.
- Users can inspect why an edge exists.

Current implementation:

- `skill-graph edges suggest` reads the saved local embedding index and proposes candidate edges.
- Suggestions include `from`, `to`, proposed edge `type`, confidence, reason, `source.kind: inferred`, `source.method: embedding_similarity`, and `reviewStatus: proposed`.
- Existing graph edges are skipped so suggestions focus on missing relationships.
- Stale embedding indexes are rejected with rebuild guidance.
- Suggestions are output only; they do not mutate `.skill-graph/index.json` or `skill-graph.yaml`.

Remaining work:

- Add an explicit review/apply workflow for accepted suggestions.
- Add LLM-assisted edge typing behind human approval.
- Store rejected suggestions so the same weak proposals are not repeated forever.

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

Goal: make skill-graph useful for teams.

Scope:

- Organization graph overlays.
- Allowlists and denylists.
- Recommended bundles.
- Private skill sources.
- Policy-driven installs.

Success criteria:

- Teams can standardize agent workflows without forcing every user to manually curate skills.

