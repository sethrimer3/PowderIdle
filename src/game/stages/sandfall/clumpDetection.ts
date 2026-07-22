export interface ClumpMote {
  id: number;
  x: number;
  y: number;
}

class UnionFind {
  private readonly parent = new Map<number, number>();
  find(a: number): number {
    if (!this.parent.has(a)) this.parent.set(a, a);
    let root = a;
    while (this.parent.get(root) !== root) root = this.parent.get(root)!;
    let cursor = a;
    while (this.parent.get(cursor) !== root) {
      const next = this.parent.get(cursor)!;
      this.parent.set(cursor, root);
      cursor = next;
    }
    return root;
  }
  union(a: number, b: number): void {
    const rootA = this.find(a),
      rootB = this.find(b);
    if (rootA !== rootB) this.parent.set(rootA, rootB);
  }
}

export function detectClumps(
  motes: readonly ClumpMote[],
  threshold: number,
): number[][] {
  const uf = new UnionFind();
  const cell = threshold;
  const key = (x: number, y: number) =>
    `${Math.floor(x / cell)},${Math.floor(y / cell)}`;
  const grid = new Map<string, ClumpMote[]>();
  for (const mote of motes) {
    uf.find(mote.id);
    const bucketKey = key(mote.x, mote.y);
    const bucket = grid.get(bucketKey);
    if (bucket) bucket.push(mote);
    else grid.set(bucketKey, [mote]);
  }
  const thresholdSq = threshold * threshold;
  for (const mote of motes) {
    const cx = Math.floor(mote.x / cell),
      cy = Math.floor(mote.y / cell);
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++) {
        const bucket = grid.get(`${cx + dx},${cy + dy}`);
        if (!bucket) continue;
        for (const other of bucket) {
          if (other.id <= mote.id) continue;
          const ddx = other.x - mote.x,
            ddy = other.y - mote.y;
          if (ddx * ddx + ddy * ddy <= thresholdSq) uf.union(mote.id, other.id);
        }
      }
  }
  const groups = new Map<number, number[]>();
  for (const mote of motes) {
    const root = uf.find(mote.id);
    const bucket = groups.get(root);
    if (bucket) bucket.push(mote.id);
    else groups.set(root, [mote.id]);
  }
  return [...groups.values()];
}
