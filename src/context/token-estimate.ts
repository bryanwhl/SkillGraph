export function estimateTokens(input: string): number {
  const trimmed = input.trim();
  if (!trimmed) {
    return 0;
  }

  return Math.max(1, Math.ceil(trimmed.length / 4));
}
