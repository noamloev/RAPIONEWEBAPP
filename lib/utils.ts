export function compareVersions(a: string, b: string): number {
  const aParts = a.split(".").map((x) => Number(x));
  const bParts = b.split(".").map((x) => Number(x));
  const len = Math.max(aParts.length, bParts.length);

  for (let i = 0; i < len; i++) {
    const av = aParts[i] ?? 0;
    const bv = bParts[i] ?? 0;

    if (av > bv) return 1;
    if (av < bv) return -1;
  }

  return 0;
}