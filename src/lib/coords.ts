/**
 * Parses a coordinate string in either decimal or DMS format.
 * Returns a decimal number, or null if the input can't be parsed.
 *
 * Accepted decimal formats:
 *   49.09700
 *   -73.35533
 *
 * Accepted DMS formats (flexible spacing/punctuation):
 *   33°54'12" N
 *   33° 54' 12" N
 *   33 54 12 N
 *   33-54-12N
 *   N 33°54'12"
 *   S 33°54'12"   (returns negative)
 *   W 78°01'02"   (returns negative)
 */
export function parseCoordinate(input: string): number | null {
  const s = input.trim();
  if (!s) return null;

  // ── Decimal ──────────────────────────────────────────────────────────────
  const decimal = parseFloat(s);
  if (!isNaN(decimal) && /^-?\d+(\.\d+)?$/.test(s)) {
    return decimal;
  }

  // ── DMS ──────────────────────────────────────────────────────────────────
  // Extract optional leading/trailing hemisphere letter
  const dmsPattern =
    /^([NSEW])?\s*(-?\d+(?:\.\d+)?)[°\s\-]+(\d+(?:\.\d+)?)['\s\-]+(\d+(?:\.\d+)?)["″\s]*([NSEW])?$/i;

  const match = s.match(dmsPattern);
  if (!match) return null;

  const hemi = (match[1] ?? match[5] ?? "").toUpperCase();
  const deg = parseFloat(match[2]);
  const min = parseFloat(match[3]);
  const sec = parseFloat(match[4]);

  if (min < 0 || min >= 60 || sec < 0 || sec >= 60) return null;

  let value = Math.abs(deg) + min / 60 + sec / 3600;
  if (hemi === "S" || hemi === "W" || deg < 0) value = -value;

  return Math.round(value * 1000000) / 1000000;
}

/** Format a decimal coordinate for display, e.g. 49.097000 */
export function formatCoord(value: number): string {
  return value.toFixed(6);
}
