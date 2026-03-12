/**
 * Parses a coordinate string in decimal, DDM, or DMS format.
 * Returns a decimal number, or null if the input can't be parsed.
 *
 * Accepted decimal:
 *   49.09700     -73.35533
 *
 * Accepted DDM (degrees + decimal minutes):
 *   41° 07.8'            41° 07.8' N
 *   73° 17.5' W          (41° 07.8', 73° 17.5' W)  ← strips parens/comma
 *   41 07.8 N            73 17.5W
 *
 * Accepted DMS (degrees, minutes, seconds):
 *   33°54'12" N          33° 54' 12" N
 *   33 54 12 N           33-54-12N
 *   N 33°54'12"          W 78°01'02"
 */
export function parseCoordinate(raw: string): number | null {
  // Strip parentheses, commas, and extra whitespace so users can paste
  // a full pair like (41° 07.8', 73° 17.5' W) into either field.
  const s = raw.replace(/[(),]/g, " ").trim();
  if (!s) return null;

  // ── Decimal ────────────────────────────────────────────────────────────────
  if (/^-?\d+(\.\d+)?$/.test(s)) {
    return parseFloat(s);
  }

  // ── DMS: degrees° minutes' seconds" [NSEW] ─────────────────────────────────
  // Requires all three components (seconds can be decimal).
  const dmsPattern =
    /^([NSEW])?\s*(-?\d+(?:\.\d+)?)[°\s\-]+(\d+(?:\.\d+)?)['\s\-]+(\d+(?:\.\d+)?)["″\s]*([NSEW])?$/i;

  const dmsMatch = s.match(dmsPattern);
  if (dmsMatch) {
    const hemi = (dmsMatch[1] ?? dmsMatch[5] ?? "").toUpperCase();
    const deg = parseFloat(dmsMatch[2]);
    const min = parseFloat(dmsMatch[3]);
    const sec = parseFloat(dmsMatch[4]);
    if (min < 0 || min >= 60 || sec < 0 || sec >= 60) return null;
    let value = Math.abs(deg) + min / 60 + sec / 3600;
    if (hemi === "S" || hemi === "W" || deg < 0) value = -value;
    return Math.round(value * 1_000_000) / 1_000_000;
  }

  // ── DDM: degrees° decimal-minutes' [NSEW] ──────────────────────────────────
  // e.g. 41° 07.8'  /  73° 17.5' W  /  41 7.8 N
  const ddmPattern =
    /^([NSEW])?\s*(-?\d+(?:\.\d+)?)[°\s\-]+(\d+(?:\.\d+)?)['\s]*([NSEW])?$/i;

  const ddmMatch = s.match(ddmPattern);
  if (ddmMatch) {
    const hemi = (ddmMatch[1] ?? ddmMatch[4] ?? "").toUpperCase();
    const deg = parseFloat(ddmMatch[2]);
    const min = parseFloat(ddmMatch[3]);
    if (min < 0 || min >= 60) return null;
    let value = Math.abs(deg) + min / 60;
    if (hemi === "S" || hemi === "W" || deg < 0) value = -value;
    return Math.round(value * 1_000_000) / 1_000_000;
  }

  return null;
}

/** Format a decimal coordinate for display, e.g. 49.097000 */
export function formatCoord(value: number): string {
  return value.toFixed(6);
}
