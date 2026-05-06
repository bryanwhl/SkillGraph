export type OperationalSummaryInput = {
  title: string;
  description: string;
  tags?: string[];
  capabilities?: string[];
  markdown?: string;
  source?: string;
  installCommand?: string;
};

export function buildOperationalSummary(input: OperationalSummaryInput): string {
  const bullets = input.markdown ? extractBulletLines(input.markdown).slice(0, 5) : [];

  return [
    `# ${input.title}`,
    "",
    "## Operational Summary",
    "",
    input.description,
    input.capabilities && input.capabilities.length > 0
      ? `Capabilities: ${input.capabilities.join(", ")}`
      : "",
    input.tags && input.tags.length > 0 ? `Tags: ${input.tags.join(", ")}` : "",
    bullets.length > 0 ? "Workflow cues:" : "",
    ...bullets.map((bullet) => `- ${bullet}`),
    input.source ? `Source: ${input.source}` : "",
    input.installCommand
      ? `Install after human approval: \`${input.installCommand}\``
      : "",
  ]
    .filter((line) => line.length > 0)
    .join("\n");
}

function extractBulletLines(markdown: string): string[] {
  return markdown
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^[-*]\s+/.test(line))
    .map((line) => line.replace(/^[-*]\s+/, "").trim())
    .filter(Boolean);
}
