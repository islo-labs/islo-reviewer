/**
 * Shared parsing for the numeric CLI arguments the three entrypoints accept.
 */

/** Parse a max-turns argument, falling back to the caller's default. */
export function parseTurns(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  return parseInt(raw, 10);
}

/** Parse a max-budget argument. Returns undefined when unset. */
export function parseBudget(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  return parseFloat(raw);
}
