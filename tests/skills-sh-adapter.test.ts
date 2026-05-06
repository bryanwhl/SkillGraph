import { describe, expect, it } from "vitest";
import {
  parseSkillsShFindOutput,
  searchSkillsSh,
  skillsShResultToNode,
} from "../src/adapters/skills-sh.js";

const sampleFindOutput = [
  "\u001b[38;5;250mSKILLS\u001b[0m",
  "",
  "\u001b[38;5;102mInstall with\u001b[0m npx skills add <owner/repo@skill>",
  "",
  "\u001b[38;5;145mvercel-labs/agent-skills@frontend-design\u001b[0m \u001b[36m108.1K installs\u001b[0m",
  "\u001b[38;5;102m-> https://skills.sh/vercel-labs/agent-skills/frontend-design\u001b[0m",
  "",
  "\u001b[38;5;145mopenai/skills@skill-creator\u001b[0m \u001b[36m195 installs\u001b[0m",
  "\u001b[38;5;102m-> https://skills.sh/openai/skills/skill-creator\u001b[0m",
  "",
].join("\n");

describe("skills.sh adapter", () => {
  it("parses skills CLI find output into installable remote results", () => {
    const results = parseSkillsShFindOutput(sampleFindOutput);

    expect(results).toEqual([
      {
        id: "frontend-design",
        name: "frontend-design",
        repository: "vercel-labs/agent-skills",
        locator: "vercel-labs/agent-skills@frontend-design",
        url: "https://skills.sh/vercel-labs/agent-skills/frontend-design",
        installCount: 108100,
        installCommand:
          "npx skills add vercel-labs/agent-skills --skill frontend-design",
      },
      {
        id: "skill-creator",
        name: "skill-creator",
        repository: "openai/skills",
        locator: "openai/skills@skill-creator",
        url: "https://skills.sh/openai/skills/skill-creator",
        installCount: 195,
        installCommand: "npx skills add openai/skills --skill skill-creator",
      },
    ]);
  });

  it("searches with an injectable runner and limits parsed results", async () => {
    const calls: string[][] = [];

    const results = await searchSkillsSh("frontend polish", {
      limit: 1,
      runner: async (args) => {
        calls.push(args);
        return sampleFindOutput;
      },
    });

    expect(calls).toEqual([["skills", "find", "frontend polish"]]);
    expect(results).toHaveLength(1);
    expect(results[0]?.name).toBe("frontend-design");
  });

  it("converts a remote result into a skill-graph node", () => {
    const [result] = parseSkillsShFindOutput(sampleFindOutput);

    const node = skillsShResultToNode(result!, {
      indexedAt: "2026-05-06T00:00:00.000Z",
      query: "frontend polish",
    });

    expect(node).toMatchObject({
      id: "frontend-design",
      name: "frontend-design",
      source: {
        type: "skills_sh",
        url: "https://skills.sh/vercel-labs/agent-skills/frontend-design",
        repository: "vercel-labs/agent-skills",
      },
      status: {
        installed: false,
      },
      tags: ["frontend", "polish", "remote", "skills-sh"],
    });
    expect(node.contextLayers.l1?.content).toContain(
      "npx skills add vercel-labs/agent-skills --skill frontend-design",
    );
    expect(node.contextLayers.l2?.content).toContain("## Operational Summary");
  });
});
