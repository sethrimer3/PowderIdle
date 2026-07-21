export interface FunnelRows {
  gridRows: number;
  gridCols: number;
  profile: ReadonlyArray<readonly [start: number, end: number]>;
}

export function getFunnelSpanForRows(
  geometry: FunnelRows,
  row: number,
  size: number
): { start: number; end: number } {
  if (geometry.gridRows <= 0 || geometry.gridCols <= 0) {
    return { start: 0, end: geometry.gridCols };
  }
  let start = 0;
  let end = geometry.gridCols;
  const maxRow = Math.min(geometry.gridRows, row + size);
  for (let currentRow = row; currentRow < maxRow; currentRow += 1) {
    const span = geometry.profile[currentRow] ?? [0, geometry.gridCols];
    start = Math.max(start, span[0]);
    end = Math.min(end, span[1]);
  }
  if (end <= start) {
    const fallbackStart = Math.max(0, Math.floor(geometry.gridCols / 2 - size / 2));
    return {
      start: fallbackStart,
      end: Math.min(geometry.gridCols, fallbackStart + size)
    };
  }
  return { start, end };
}

export function clampColumnToFunnel(
  geometry: FunnelRows,
  col: number,
  row: number,
  size: number
): number {
  if (geometry.gridCols <= 0) return col;
  const span = getFunnelSpanForRows(geometry, row, size);
  const minCol = Math.max(0, Math.min(span.start, geometry.gridCols - size));
  const maxCol = Math.max(
    minCol,
    Math.min(geometry.gridCols - size, span.end - size)
  );
  return Math.max(minCol, Math.min(maxCol, col));
}
