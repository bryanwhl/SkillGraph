# Draft Graph Schema

This schema is intentionally draft-level. It is designed to capture the minimum information needed for progressive disclosure and runtime resolution.

## Skill Node

```yaml
id: frontend.design
name: frontend-design
title: Frontend Design
kind: workflow
description: Improve UI visual quality, hierarchy, layout, and interaction polish.
source:
  type: skills_sh
  url: https://skills.sh/anthropics/skills/frontend-design
  repository: https://github.com/anthropics/skills
runtime:
  compatible:
    - codex
    - claude
status:
  installed: false
  local_path: null
trust:
  source_reputation: official
  install_count: 100000
  stars: 1000
  reviewed: false
tags:
  - frontend
  - design
  - ui
  - polish
capabilities:
  - visual_hierarchy
  - responsive_layout
  - interaction_polish
  - design_review
context_layers:
  l0:
    token_estimate: 40
    content_ref: inline
  l1:
    token_estimate: 180
    content_ref: generated/capability-card.md
  l2:
    token_estimate: 700
    content_ref: generated/operational-summary.md
  l3:
    token_estimate: 1800
    content_ref: SKILL.md
  l4:
    token_estimate: variable
    content_refs:
      - examples/
      - scripts/
provenance:
  indexed_at: 2026-05-04T00:00:00Z
  adapter: skills_sh
  confidence: 1.0
```

## Edge

```yaml
from: frontend.design
to: frontend.accessibility
type: complements
confidence: 0.82
source:
  kind: inferred
  method: llm
  evidence:
    - overlapping task triggers
    - common co-usage in frontend polish workflows
review:
  status: proposed
  reviewer: null
```

## Edge Suggestion

Inferred edges are emitted as review items before they become canonical graph metadata:

```json
{
  "from": "frontend-design",
  "to": "visual-qa",
  "type": "complements",
  "confidence": 0.72,
  "similarity": 0.72,
  "reason": "Embedding similarity 0.720 between normalized skill context; proposed for human review.",
  "reviewStatus": "proposed",
  "source": {
    "kind": "inferred",
    "method": "embedding_similarity"
  }
}
```

## Edge Types

### `contains`

Taxonomy relationship.

Example:

```text
web-development contains frontend
frontend contains frontend.design
```

### `requires`

One node needs prerequisite context from another.

Example:

```text
react-performance requires react-basics
```

### `specializes`

One node is a more specific form of another.

Example:

```text
tailwind-patterns specializes frontend.css
```

### `complements`

Two skills improve each other when used together.

Example:

```text
frontend-design complements visual-qa
```

### `conflicts_with`

Two skills may issue incompatible instructions.

Example:

```text
tailwind-only-style conflicts_with css-modules-only-style
```

### `duplicates`

Two skills substantially overlap.

Example:

```text
ui-polish duplicates frontend-design
```

### `supersedes`

One skill should generally replace another.

Example:

```text
nextjs-15-best-practices supersedes nextjs-13-best-practices
```

### `applies_to`

A skill is relevant when a detected framework, language, platform, or environment exists.

Example:

```text
react-best-practices applies_to react
```

## Bundle Node

Bundles are nodes that define common workflows.

```yaml
id: bundle.frontend-polish
name: frontend-polish-bundle
kind: bundle
description: Recommended graph for polishing a frontend implementation.
members:
  - node: web-development.frontend
    depth: summary
  - node: frontend.design
    depth: full
  - node: frontend.accessibility
    depth: summary
  - node: frontend.visual-qa
    depth: full
```

## Resolution Result

```json
{
  "task": "Make this React dashboard polished",
  "selected": [
    {
      "node": "web-development",
      "depth": "summary",
      "reason": "Ancestor context for frontend work"
    },
    {
      "node": "frontend.design",
      "depth": "full",
      "reason": "Directly matches UI polish task"
    },
    {
      "node": "react.best-practices",
      "depth": "capability_card",
      "reason": "React may be relevant; expand after repo detection"
    }
  ],
  "frontier": [
    "frontend.accessibility",
    "frontend.visual-qa",
    "tailwind.patterns"
  ],
  "missing": [
    {
      "node": "frontend.design",
      "install_command": "npx skills add anthropics/skills@frontend-design"
    }
  ],
  "conflicts": [],
  "budget": {
    "requested_tokens": 4000,
    "estimated_tokens": 2850
  }
}
```

## Embedding Index

Semantic search stores local vectors separately from the canonical graph:

```json
{
  "version": 1,
  "provider": "qwen3-local",
  "model": "Qwen/Qwen3-Embedding-0.6B",
  "dimensions": 1024,
  "indexedAt": "2026-05-06T00:00:00.000Z",
  "graphIndexedAt": "2026-05-06T00:00:00.000Z",
  "vectors": [
    {
      "node": "frontend-design",
      "textHash": "sha256-of-normalized-embedding-text",
      "vector": [0.01, -0.02]
    }
  ]
}
```

Embedding indexes are optional local state under `.skillgraph/embeddings.json`. They are not source-of-truth graph data and can be deleted or rebuilt.

## Schema Principles

- Preserve original skill content.
- Add generated summaries as separate layers.
- Store semantic vectors as local, rebuildable derived data.
- Track provenance for inferred data.
- Treat unreviewed edges as proposals.
- Prefer graph internals and tree-like views.

