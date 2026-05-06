# Marketplace Strategy

skill-graph should complement existing marketplaces rather than compete with them at the beginning.

## Relationship to skills.sh

skills.sh is a marketplace and discovery surface for open agent skills.

skill-graph should use skills.sh as a source of truth for:

- Public skill discovery.
- Skill pages.
- Install commands.
- Popularity signals.
- Repository provenance.

The resolver adds:

- Runtime graph traversal.
- Relationship metadata.
- Context depth selection.
- Local installed-skill awareness.
- Progressive expansion.
- Conflict detection.
- Agent-specific context plans.

## Why Not Build a Website First?

A website is useful for browsing, but it lacks live runtime context.

An agent needs to know:

- What the user is asking right now.
- What repository is open.
- What skills are already installed.
- Which agent runtime is active.
- What token budget is available.
- Whether the user approves a new install.

Those are runtime questions, so the first useful product should be a local resolver and agent skill.

## Future Website

A hosted website can later expose:

- Skill graph visualization.
- Domain trees.
- Recommended bundles.
- Trust and provenance details.
- Relationship review workflows.
- Community graph contributions.

The hosted site should be generated from the same graph data used by the CLI.

## Skill Author Metadata

Over time, skill authors could add optional `skill-graph.yaml` metadata:

```yaml
domains:
  - frontend
  - design
requires:
  - web-development.frontend
complements:
  - frontend.accessibility
  - frontend.visual-qa
applies_to:
  - react
  - nextjs
context_layers:
  summary: generated/summary.md
```

This should remain optional. The resolver can infer initial metadata, then let authors improve it.

## Trust Model

Trust should be visible, not hidden.

Signals may include:

- Official source.
- Repository stars.
- Install count.
- Recent maintenance.
- License.
- Signed releases.
- Community reviews.
- Local allowlist.
- Organization policy.

The resolver should not pretend that trust is binary.

