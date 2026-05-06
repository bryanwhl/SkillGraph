# Runtime Protocol

This document describes how an AI agent should use skill-graph during a task.

## Principle

The agent should not treat skills as a one-time flat lookup. It should treat skills as a graph of progressively disclosed context.

The runtime loop is:

1. Resolve.
2. Load shallow context.
3. Inspect task and repository.
4. Expand only relevant nodes.
5. Ask before installing remote skills.
6. Apply loaded context.
7. Explain what was used.

## Agent Behavior

### 1. Decide Whether skill-graph Is Relevant

Use skill-graph when the user task involves a specialized domain, repeated workflow, or likely existing skill.

Examples:

- Frontend implementation.
- UI design polish.
- Testing strategy.
- Deployment.
- Documentation.
- Security review.
- Performance optimization.
- Framework-specific work.

### 2. Resolve the Initial Graph

The agent calls:

```bash
skill-graph resolve "<task>"
```

The resolver returns:

- Recommended nodes.
- Context depth for each node.
- Missing remote skills.
- Conflicts.
- Frontier nodes that may be expanded later.
- Explanation.

### 3. Load the Initial Context

The agent loads only the selected context layers.

Example:

```json
{
  "load": [
    { "node": "web-development", "depth": "summary" },
    { "node": "frontend", "depth": "summary" },
    { "node": "frontend-design", "depth": "capability_card" }
  ],
  "frontier": [
    "react-best-practices",
    "accessibility-review",
    "visual-qa"
  ]
}
```

### 4. Ask Before Installing

If a selected node is remote and not installed, the agent must ask for approval.

The prompt should include:

- Skill name.
- Source.
- Install command.
- Why it is relevant.
- Trust indicators.
- What will be loaded after install.

### 5. Expand as the Task Evolves

After inspecting the repo or task details, the agent may call:

```bash
skill-graph expand react-best-practices --depth full
```

Expansion should be justified by new evidence:

- Repository uses React.
- Repository uses Tailwind.
- Task requires accessibility.
- Existing tests use Playwright.
- Deployment target is Vercel.

### 6. Avoid Context Flooding

The agent should prefer:

- Ancestors at summary depth.
- Prerequisites at summary depth.
- One or two specialized nodes at full depth.
- Deep artifacts only when executing specific procedures.

### 7. Report What Was Used

At the end of a task, the agent should summarize:

- Which skill nodes were loaded.
- Which remote skills were installed.
- Which frontier nodes were not needed.
- Any conflicts or skipped recommendations.

## Proposed Tool Interface

### `resolve`

```bash
skill-graph resolve "<task>" \
  --agent codex \
  --budget 4000 \
  --format json
```

Returns a ranked context plan.

Use `--strategy hybrid` when a local embedding index exists and the task benefits from both exact lexical matching and conceptual matching. Use `--strategy semantic` only after `skill-graph embeddings index` has been run.

### `embeddings`

```bash
skill-graph embeddings index --provider qwen3-local
skill-graph embeddings info
```

Builds and inspects the optional local semantic index. The real provider runs locally; any future provider that uploads local task or repository text requires explicit human approval.

### `edges suggest`

```bash
skill-graph edges suggest --format markdown
```

Proposes inferred graph edges from the saved local embedding index. Treat these as review items only; they are not active resolver policy unless a human accepts and records them in graph metadata.

### `expand`

```bash
skill-graph expand <node-id> --depth full --format markdown
```

Returns deeper context for one node.

### `install`

```bash
skill-graph install <node-id>
```

Installs the source skill after approval.

### `explain`

```bash
skill-graph explain --last
```

Explains the last resolution path.

## Example Frontend Flow

User:

```text
Make this dashboard feel like a polished production SaaS tool.
```

Agent:

1. Resolves the task.
2. Loads `web-development` and `frontend` summaries.
3. Proposes installing `frontend-design` if missing.
4. Inspects package files and detects React.
5. Expands `react-best-practices`.
6. Keeps `accessibility-review` on the frontier.
7. Implements the frontend.
8. Expands `visual-qa` before final verification.

This captures progressive disclosure: the graph starts shallow and widens or deepens only when the work needs it.

