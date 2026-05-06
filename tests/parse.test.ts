import { describe, expect, it } from "vitest";
import { parseSkillFile } from "../src/adapters/skill-parser.js";
import { fixturePath } from "./support/paths.js";

describe("parseSkillFile", () => {
  it("normalizes SKILL.md frontmatter into a local skill node", async () => {
    const filePath = fixturePath("skills", "frontend-design", "SKILL.md");

    const node = await parseSkillFile(filePath, {
      rootPath: fixturePath("skills"),
      sourceType: "project",
    });

    expect(node).toMatchObject({
      id: "frontend-design",
      name: "frontend-design",
      title: "Frontend Design",
      description:
        "Improve UI visual quality, hierarchy, responsive layout, and interaction polish for production interfaces.",
      kind: "skill",
      source: {
        type: "project",
        path: filePath,
      },
      runtime: {
        compatible: ["codex", "claude"],
      },
      status: {
        installed: true,
        localPath: filePath,
      },
      tags: ["frontend", "design", "ui"],
      capabilities: [
        "visual_hierarchy",
        "responsive_layout",
        "interaction_polish",
      ],
    });
    expect(node.contextLayers.l0.content).toContain("frontend-design");
    expect(node.contextLayers.l1?.content).toContain("Improve UI visual quality");
    expect(node.contextLayers.l3?.contentRef).toBe(filePath);
  });
});
