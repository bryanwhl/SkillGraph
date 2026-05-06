import { describe, expect, it } from "vitest";
import { indexSkills } from "../src/graph/builder.js";
import { expandNode } from "../src/resolver/expand.js";
import { explainResolution, resolveTask } from "../src/resolver/plan.js";
import { fixturePath } from "./support/paths.js";

describe("resolveTask and expandNode", () => {
  it("returns a budget-aware context plan with ancestors, direct matches, frontier, and conflicts", async () => {
    const graph = await indexSkills({
      cwd: fixturePath(),
      skillRoots: [fixturePath("skills")],
      graphFiles: [fixturePath("skillgraph.yaml")],
      now: "2026-05-06T00:00:00.000Z",
    });

    const resolution = resolveTask(graph, {
      task: "Make this frontend dashboard polished and production-ready",
      agent: "codex",
      budgetTokens: 1600,
    });

    expect(resolution.selected.map((item) => item.node)).toEqual([
      "web-development",
      "frontend",
      "frontend-design",
    ]);
    expect(resolution.selected.find((item) => item.node === "frontend-design"))
      .toMatchObject({
        depth: "l3",
        status: "local",
      });
    expect(resolution.frontier).toContainEqual(
      expect.objectContaining({
        node: "visual-qa",
      }),
    );
    expect(resolution.conflicts).toContainEqual(
      expect.objectContaining({
        from: "frontend-design",
        to: "typescript-advanced-types",
      }),
    );
    expect(resolution.budget.estimatedTokens).toBeLessThanOrEqual(1600);
  });

  it("expands shallow and full context for an installed skill", async () => {
    const graph = await indexSkills({
      cwd: fixturePath(),
      skillRoots: [fixturePath("skills")],
      graphFiles: [fixturePath("skillgraph.yaml")],
      now: "2026-05-06T00:00:00.000Z",
    });

    const card = await expandNode(graph, "frontend-design", "l1");
    const full = await expandNode(graph, "frontend-design", "full");

    expect(card.content).toContain("Improve UI visual quality");
    expect(full.depth).toBe("l3");
    expect(full.content).toContain("# Frontend Design");
  });

  it("formats explainable Markdown from the last resolution", async () => {
    const graph = await indexSkills({
      cwd: fixturePath(),
      skillRoots: [fixturePath("skills")],
      graphFiles: [fixturePath("skillgraph.yaml")],
      now: "2026-05-06T00:00:00.000Z",
    });
    const resolution = resolveTask(graph, {
      task: "Make this frontend dashboard polished",
      agent: "codex",
      budgetTokens: 1600,
    });

    const markdown = explainResolution(resolution);

    expect(markdown).toContain("## Selected");
    expect(markdown).toContain("frontend-design");
    expect(markdown).toContain("## Frontier");
  });
});
