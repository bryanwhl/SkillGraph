# Product Requirements Document: SkillGraph

## 1. Summary

SkillGraph is a runtime and indexing layer that organizes AI agent skills into a graph for progressive disclosure. It helps an agent discover, select, load, and expand skills during a task without flooding the context window or relying on a one-shot flat skill search.

The first product should be a local CLI plus an agent skill that can:

- Search local installed skills and remote skill marketplaces such as skills.sh.
- Normalize skills into graph nodes with typed relationships.
- Resolve the smallest useful subgraph for a user task.
- Ask the user before installing remote skills.
- Load approved skill context immediately by reading downloaded skill files.
- Explain why each skill node was selected.

The hosted website can come later as a public visual index over the same graph data.

## 2. Problem

AI agent skills are increasingly useful, but the current interaction model is mostly flat.

An agent typically receives a list of available skill descriptions and decides whether to load one. If the needed skill is not installed, the user or a separate discovery skill must search a marketplace, evaluate options, install the skill, and restart or rescan the agent environment.

This creates several problems:

- **Flat discovery:** Skills are selected from a list, not navigated through capability structure.
- **Weak progressive disclosure:** Agents often choose between shallow metadata and full skill loading, without intermediate context layers.
- **No prerequisite reasoning:** A specialized skill may depend on broader domain assumptions that are not loaded.
- **No relationship model:** Existing systems do not generally express that one skill complements, requires, conflicts with, duplicates, or supersedes another.
- **No task-evolving retrieval:** The skill choice often happens once, even though the agent learns more after inspecting the codebase.
- **Marketplace disconnect:** Remote skill discovery is separate from the immediate runtime loop.
- **Trust ambiguity:** Agents need a structured way to account for source reputation, installs, stars, provenance, and local user approval.

## 3. Product Vision

SkillGraph makes skills navigable and progressively disclosed.

Instead of asking, "Which single skill should I load?", the agent asks:

> "What capability graph am I entering, what shallow context should I load first, and which deeper nodes should remain available if the task requires them?"

For example, given:

> "Make this React dashboard feel polished and production-ready."

The resolver may return:

- `web-development` at summary depth.
- `frontend` at summary depth.
- `ui-design` at capability-card depth.
- `frontend-design` as a candidate full skill.
- `react-best-practices` as a candidate full skill if React is detected.
- `accessibility-review` as a complement.
- `visual-qa` as a verification node.

The agent can begin with shallow context, inspect the repository, then expand only the relevant branches.

## 4. Goals

### 4.1 User Goals

- Find relevant agent skills without manually browsing multiple registries.
- Understand why a skill is recommended before installing it.
- Keep control over remote skill installation.
- Have the agent use newly installed skill content immediately.
- Avoid context overload from loading too many full skills.
- Build repeatable bundles for common workflows such as frontend polish, PR review, testing, and deployment.

### 4.2 Agent Goals

- Retrieve skill context at the right granularity.
- Expand context dynamically as the task evolves.
- Understand skill prerequisites and complements.
- Avoid conflicting or duplicate skill instructions.
- Explain skill choices to the user.
- Operate across agent runtimes such as Codex and Claude Code.

### 4.3 Ecosystem Goals

- Complement existing marketplaces such as skills.sh.
- Provide a graph index that can be reused by CLIs, websites, and agent skills.
- Encourage skill authors to publish richer metadata over time.
- Preserve compatibility with existing `SKILL.md` formats.

## 5. Non-Goals

- Do not build a complete agent runtime.
- Do not replace skills.sh or other marketplaces.
- Do not automatically install remote skills without explicit user approval.
- Do not require agent vendors to support native nested skills.
- Do not assume all skill relationships form a strict tree.
- Do not build the first implementation before validating the product design.

## 6. Target Users

### 6.1 Primary Users

- AI-agent power users who install and curate skills.
- Developers using Codex, Claude Code, Cursor, or similar coding agents.
- Teams building internal skill libraries for repeated workflows.

### 6.2 Secondary Users

- Skill authors who want their skills to be discoverable in context.
- Marketplace maintainers who want better categorization and recommendation.
- Agent runtime builders exploring dynamic context retrieval.

## 7. Key Concepts

### 7.1 Skill Node

A skill node is a graph representation of a skill, concept, workflow, tool, checklist, bundle, or domain context.

Examples:

- `web-development`
- `frontend`
- `frontend-design`
- `react-best-practices`
- `accessibility-review`
- `visual-qa`

### 7.2 Edge

An edge describes the relationship between two nodes.

Initial edge types:

- `contains`: parent-child taxonomy relationship.
- `requires`: one skill needs prerequisite context from another.
- `specializes`: one node is a more specific form of another.
- `complements`: skills often work well together.
- `conflicts_with`: skills may issue incompatible guidance.
- `duplicates`: skills have overlapping purpose.
- `supersedes`: one skill should generally replace another.
- `applies_to`: a skill applies to a framework, language, platform, or context.

### 7.3 Context Depth

Every node should expose multiple levels of context:

- `L0`: name, short description, source, tags.
- `L1`: capability card, roughly 100-200 tokens.
- `L2`: operational summary, roughly 500-800 tokens.
- `L3`: full `SKILL.md` content.
- `L4`: referenced files, scripts, examples, templates, or assets.

### 7.4 Graph Frontier

The graph frontier is the current set of candidate nodes the agent may expand next.

The frontier lets the agent progressively disclose deeper context only when needed.

### 7.5 Resolver

The resolver receives task context and returns a ranked, budget-aware skill subgraph.

Inputs may include:

- User task.
- Current repository metadata.
- Installed skills.
- Remote marketplace candidates.
- Agent runtime.
- Token budget.
- Trust policy.

Outputs may include:

- Selected nodes.
- Recommended context depth per node.
- Missing skills that require installation.
- Conflicts and alternatives.
- Explanation of choices.

## 8. Why a Graph Helps

Flat skill search answers:

> "What skill matches this query?"

SkillGraph answers:

> "What capability area is this task in, what context should be loaded first, what dependencies or complements matter, and what should the agent expand next as it learns more?"

The graph is useful because:

- Skills belong to multiple domains.
- Specialized skills often need broader prerequisite context.
- Adjacent skills can improve output quality.
- Conflicting skills need explicit handling.
- Context budget requires staged loading.
- Agents learn new task facts over time.

The graph should be internally represented as a directed graph or DAG, with tree-like views rendered for usability.

## 9. Comparison with find-skills

`find-skills` is a discovery skill. It helps search skills.sh, evaluate candidates, and install skills.

SkillGraph should include discovery, but its primary value is runtime context orchestration.

| Capability | find-skills | SkillGraph |
| --- | --- | --- |
| Search skills.sh | Yes | Yes |
| Recommend skills | Yes | Yes |
| Install with approval | Yes | Yes |
| Represent skill relationships | Limited | Core feature |
| Load partial context layers | No | Core feature |
| Expand context during task | No | Core feature |
| Track prerequisites and complements | Limited | Core feature |
| Detect conflicts and duplicates | Limited | Core feature |
| Explain graph path | Limited | Core feature |
| Compile to agent-specific skill formats | No | Planned |

## 10. Primary User Stories

### 10.1 Frontend Skill Discovery

As a Codex user, I want the agent to search for frontend-related skills before starting a UI task, so that it can improve the implementation with relevant design and framework guidance.

Acceptance criteria:

- The agent asks before installing any remote skill.
- The agent shows why each skill is relevant.
- The agent can load the downloaded skill content immediately.
- The agent can proceed if the user declines installation.

### 10.2 Progressive Skill Loading

As an agent, I want to load a broad skill summary first, then expand deeper nodes only if needed, so that I preserve context budget.

Acceptance criteria:

- Resolver returns context depth per selected node.
- Agent can request `expand(node_id, depth)`.
- Resolver prevents uncontrolled expansion when token budget is constrained.
- User can inspect what was loaded.

### 10.3 Skill Conflict Handling

As a user, I want to know when two recommended skills may conflict, so that I can choose which guidance should dominate.

Acceptance criteria:

- Graph supports `conflicts_with` edges.
- Resolver warns before loading conflicting full skills.
- User can choose a preferred skill.

### 10.4 Local and Remote Awareness

As a user, I want the resolver to prefer installed skills when they are good enough, so that it does not constantly ask to install more packages.

Acceptance criteria:

- Resolver checks local skills first.
- Remote skills are proposed only when they materially improve the task.
- Results indicate installed vs remote status.

### 10.5 Skill Bundle Creation

As a team lead, I want to define bundles for common workflows, so that agents can consistently load the right skill graph for repeated tasks.

Acceptance criteria:

- Bundles are graph nodes.
- Bundles can reference local and remote skills.
- Bundles can define default context depths.

## 11. MVP Scope

The MVP should be a local CLI plus one agent skill.

### 11.1 CLI

Proposed commands:

```bash
skillgraph index
skillgraph search "frontend design"
skillgraph resolve "make this dashboard production-ready"
skillgraph expand frontend-design --depth full
skillgraph install frontend-design
skillgraph explain
```

### 11.2 Agent Skill

The first agent skill teaches the runtime protocol:

- Search graph before specialized work.
- Start shallow.
- Ask before installing.
- Expand only when needed.
- Read newly installed `SKILL.md` immediately.
- Explain skill choices.

### 11.3 Index Sources

Initial sources:

- Local Codex skills.
- Local Claude skills.
- skills.sh public marketplace.
- GitHub repositories referenced by skills.sh.

### 11.4 Output Format

Resolver output should be machine-readable JSON and human-readable Markdown.

## 12. Out of Scope for MVP

- Hosted website.
- User accounts.
- Cloud sync.
- Automated trust certification.
- Full semantic codebase analysis.
- Native integration with agent vendors.
- Automatic background filesystem watching.

## 13. Functional Requirements

### 13.1 Skill Ingestion

The system must ingest:

- `SKILL.md` metadata.
- Skill descriptions.
- Repository URLs.
- Install commands.
- Source marketplace metadata.
- Local installed status.

The system should ingest:

- README files.
- Referenced scripts.
- Examples.
- License metadata.
- Install counts.
- Stars and source reputation.

### 13.2 Graph Construction

The system must support:

- Manual edges from `skillgraph.yaml`.
- Heuristic edges from tags and paths.
- Embedding-based similarity.
- LLM-assisted relationship proposals.
- Provenance for every generated edge.

The system should never silently treat inferred edges as canonical. Inferred edges should carry confidence and source metadata.

### 13.3 Runtime Resolution

The resolver must:

- Accept a task query.
- Search local and remote candidates.
- Rank candidates by relevance, trust, availability, compatibility, and token cost.
- Include ancestors and prerequisites at shallow depth.
- Include candidate specialized skills at the minimum useful depth.
- Return expansion options.
- Explain the selected path.

Retrieval should roll out in phases:

1. Deterministic lexical retrieval for the first local MVP.
2. BM25 lexical retrieval once relevance tests exist.
3. Unified BM25 retrieval across local skills and cached remote candidates.
4. Optional semantic retrieval using embeddings.
5. Hybrid retrieval that fuses BM25, semantic similarity, and graph-aware reranking.

Semantic retrieval must be optional and must respect the privacy requirements in section 14.2.

Current implementation: BM25 is the default local retrieval strategy for `search` and `resolve`, with deterministic lexical retrieval still available as a baseline strategy.

### 13.4 Installation

The system must:

- Ask before installing remote skills.
- Show source URL, install count if available, and trust indicators.
- Support dry-run.
- Record installed skill provenance.
- Read installed skill files immediately for current-turn use.

Current implementation: remote discovery is dry-run only. `remote-cache` and `index --skills-sh-query` cache skills.sh metadata and expose install commands, but they do not execute installs.

### 13.5 Progressive Disclosure

The system must:

- Represent multiple context layers per node.
- Support `expand(node_id, depth)`.
- Track already loaded context.
- Avoid reloading duplicate content.
- Respect a token budget.

### 13.6 Compatibility

The system should support:

- Codex skills.
- Claude Code skills.
- Agent Skills open standard directories.
- skills.sh install syntax.

## 14. Non-Functional Requirements

### 14.1 Security

- Remote installs require explicit user approval.
- Skill source and repository must be shown before install.
- Executable scripts inside skills must not run during indexing.
- The resolver should treat untrusted skills as read-only text until approved.
- The project should eventually support deny lists and allow lists.

### 14.2 Privacy

- Local skill indexing should stay local by default.
- Repository context should not be uploaded to a hosted service unless the user opts in.
- The resolver should support offline mode for local-only skill selection.

### 14.3 Performance

- Local resolution should complete within 1 second for hundreds of installed skills.
- Remote search should stream or cache results.
- Graph index should be incremental.

### 14.4 Explainability

- Every recommendation should include a reason.
- Every inferred edge should include provenance.
- The agent should be able to show what context was loaded.

## 15. Proposed Architecture

See [docs/architecture.md](./docs/architecture.md).

High-level components:

- Source adapters.
- Skill normalizer.
- Graph builder.
- Edge inference pipeline.
- Local graph store.
- Runtime resolver.
- Installer adapter.
- Agent skill protocol.
- Optional hosted index and website.

## 16. Algorithmic Methodology

### 16.1 Ingestion

For each source:

1. Fetch skill metadata.
2. Parse frontmatter.
3. Extract title, description, triggers, domains, tools, scripts, examples, and install information.
4. Produce a normalized `SkillNode`.

### 16.2 Context Layer Generation

For each node:

1. Preserve original `SKILL.md` as full context.
2. Generate a capability card.
3. Generate an operational summary.
4. Link referenced files as deep artifacts.
5. Store token estimates for each layer.

### 16.3 Edge Generation

Use a staged approach:

1. Deterministic taxonomy from source path and tags.
2. Rule-based edges from explicit metadata.
3. Embedding similarity for candidate neighbors.
4. LLM proposals for semantic edges.
5. Human review or confidence thresholds before canonicalization.

### 16.4 Resolution

Given a task:

1. Normalize and classify the task using the enabled retrieval providers.
2. Retrieve candidate nodes.
3. Add ancestors and prerequisites.
4. Add high-value complements.
5. Remove conflicts or ask the user to choose.
6. Assign context depth under budget.
7. Return a frontier for future expansion.

The first implementation should retrieve candidates with deterministic lexical scoring. Later versions should add BM25, then optional semantic embeddings, then hybrid fusion. Embedding the task should only happen when semantic retrieval is enabled and the user has approved any provider that uploads task or repository context.

Draft scoring:

```text
score =
  task_relevance
+ graph_neighbor_relevance
+ source_trust
+ local_availability
+ runtime_compatibility
+ repository_context_match
- token_cost
- conflict_penalty
- redundancy_penalty
```

## 17. Success Metrics

### 17.1 MVP Metrics

- Time from task to recommended skill set.
- Number of useful skill recommendations accepted.
- Reduction in irrelevant full skill loads.
- Number of tasks where progressive expansion is used.
- User-rated quality of recommendation explanations.

### 17.2 Long-Term Metrics

- Size and quality of public graph.
- Number of skills with verified relationship metadata.
- Number of agent runtimes supported.
- Repeat usage for common workflows.
- Community contribution rate.

## 18. Open Questions

- Should the graph index be local-first with optional hosted sync, or hosted-first with local cache?
- What is the minimum metadata skill authors should provide?
- How should inferred edges be reviewed?
- How should trust scores be computed without unfairly disadvantaging new authors?
- Should bundles be authored manually or inferred from common co-usage?
- How should agent runtimes expose currently loaded skill context?
- How much should the resolver know about the active codebase?

## 19. Risks

- The graph may become noisy if inferred relationships are low quality.
- Agent vendors may not expose enough hooks for clean runtime integration.
- Users may resist installation prompts if recommendations are too frequent.
- Marketplace metadata may be incomplete or inconsistent.
- A hosted index may create centralization concerns.

## 20. Recommended First Milestone

Build a local prototype that supports:

- Indexing local Codex skills.
- Searching skills.sh.
- Creating a small hand-authored graph for frontend, testing, docs, and deployment.
- Resolving skill context for one task.
- Reading selected `SKILL.md` files into current-turn context.
- Producing a clear explanation of selected nodes.

This milestone proves the core thesis without requiring a hosted marketplace or vendor-level integration.

