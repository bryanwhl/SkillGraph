---
name: skillgraph
description: Use the local SkillGraph CLI to resolve tasks into graph-based skill context, load shallow context first, and expand full skills only when needed.
---

# SkillGraph

Use this skill when a task could benefit from specialized agent skills, especially work involving frontend polish, testing, documentation, deployment, security review, performance, or framework-specific implementation.

## Runtime Loop

1. Resolve the task before specialized work:

   ```bash
   skillgraph resolve "<task>" --format markdown
   ```

2. Load the selected shallow context first.
3. Inspect the task and repository.
4. Expand only nodes justified by new evidence:

   ```bash
   skillgraph expand <node-id> --depth summary
   ```

5. Expand to full context only when the summary is insufficient:

   ```bash
   skillgraph expand <node-id> --depth full
   ```

6. Ask before installing any remote skill.
7. At the end, report which nodes were loaded and which frontier nodes were skipped.

## Commands

- `skillgraph index`: scan local skill roots and write `.skillgraph/index.json`.
- `skillgraph index --skills-sh-query "<query>"`: include not-installed skills.sh candidates in the graph for the current domain.
- `skillgraph remote-cache "<query>"`: cache skills.sh candidates and show approval-required install commands.
- `skillgraph embeddings index`: build a local semantic embedding index. Use the default `qwen3-local` provider only when local Python dependencies and model storage are acceptable; use `--provider deterministic` for tests and demos.
- `skillgraph embeddings info`: show the saved local embedding provider, model, dimensions, and vector count.
- `skillgraph edges suggest`: propose inferred edges from embedding similarity for human review; do not treat proposed edges as canonical.
- `skillgraph search "<query>"`: search the local graph with BM25 by default; use `--strategy lexical` for baseline comparison, `--strategy semantic` after embeddings exist, or `--strategy hybrid` for BM25 plus lexical plus semantic fusion.
- `skillgraph resolve "<task>"`: return selected nodes, context depths, frontier nodes, conflicts, missing nodes, scoring provider provenance, and reasons. Hybrid resolution includes semantic results only when a local embedding index already exists.
- `skillgraph expand <node-id> --depth <depth>`: load deeper context for one node.
- `skillgraph context`: show context layers loaded in the current workspace.
- `skillgraph explain --last`: explain the last resolution path.
- `skillgraph install <node-id>`: show the exact dry-run install command for a remote node when available.

## Operating Rules

- Prefer installed local skills when they are good enough.
- Use ancestors at shallow depth.
- Use direct matches at the deepest useful depth allowed by budget.
- Keep complements on the frontier until the task requires them.
- Treat conflicts as warnings that need human review before loading both skills at full depth.
- Treat inferred edge suggestions as review items, not active resolver policy.
- Never install remote skills without explicit user approval.
- Treat remote-cache results as metadata only until the user approves an install.
- Do not enable any embedding provider that uploads local task, repository, or private skill text without explicit human approval.
