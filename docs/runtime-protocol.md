# Runtime Protocol

This document describes how an AI agent should use SkillGraph Resolver during a task.

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

### 1. Decide Whether SkillGraph Is Relevant

Use SkillGraph when the user task involves a specialized domain, repeated workflow, or likely existing skill.

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
skillgraph resolve "<task>"
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
skillgraph expand react-best-practices --depth full
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
skillgraph resolve "<task>" \
  --agent codex \
  --budget 4000 \
  --format json
```

Returns a ranked context plan.

### `expand`

```bash
skillgraph expand <node-id> --depth full --format markdown
```

Returns deeper context for one node.

### `install`

```bash
skillgraph install <node-id>
```

Installs the source skill after approval.

### `explain`

```bash
skillgraph explain --last
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

