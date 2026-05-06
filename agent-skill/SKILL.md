---
name: skill-graph
description: Use the local skill-graph CLI to resolve tasks into graph-based skill context, load shallow context first, and expand full skills only when needed.
---

# skill-graph

Use this skill when a task could benefit from specialized agent skills, especially work involving frontend polish, testing, documentation, deployment, security review, performance, or framework-specific implementation.

## Runtime Loop

1. Resolve the task before specialized work:

   ```bash
   skill-graph resolve "<task>" --format markdown
   ```

2. Load the selected shallow context first.
3. Inspect the task and repository.
4. Expand only nodes justified by new evidence:

   ```bash
   skill-graph expand <node-id> --depth summary
   ```

5. Expand to full context only when the summary is insufficient:

   ```bash
   skill-graph expand <node-id> --depth full
   ```

6. Ask before installing any remote skill.
7. At the end, report which nodes were loaded and which frontier nodes were skipped.

## Commands

- `skill-graph index`: scan local skill roots and write `.skill-graph/index.json`.
- `skill-graph index --skills-sh-query "<query>"`: include not-installed skills.sh candidates in the graph for the current domain.
- `skill-graph remote-cache "<query>"`: cache skills.sh candidates and show approval-required install commands.
- `skill-graph embeddings index`: build a local semantic embedding index. Use the default `qwen3-local` provider only when local Python dependencies and model storage are acceptable; use `--provider deterministic` for tests and demos.
- `skill-graph embeddings index --trust-remote-code`: allow model repository code execution only after explicit human review of the model source.
- `skill-graph embeddings info`: show the saved local embedding provider, model, dimensions, and vector count.
- `skill-graph edges suggest`: propose inferred edges from embedding similarity for human review; do not treat proposed edges as canonical.
- `skill-graph search "<query>"`: search the local graph with BM25 by default; use `--strategy lexical` for baseline comparison, `--strategy semantic` after embeddings exist, or `--strategy hybrid` for BM25 plus lexical plus semantic fusion.
- `skill-graph resolve "<task>"`: return selected nodes, context depths, frontier nodes, conflicts, missing nodes, scoring provider provenance, and reasons. Hybrid resolution includes semantic results only when a local embedding index already exists.
- `skill-graph expand <node-id> --depth <depth>`: load deeper context for one node.
- `skill-graph context`: show context layers loaded in the current workspace.
- `skill-graph explain --last`: explain the last resolution path.
- `skill-graph install <node-id>`: show the exact dry-run install command for a remote node when available.

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
- Do not pass `--trust-remote-code` unless the user explicitly accepts local execution of model repository code.
