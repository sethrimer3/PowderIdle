export interface ViewportRect {
  x: number;
  y: number;
  size: number;
  sourceX: number;
  sourceY: number;
  sourceSize: number;
  scale: number;
}
export function computeViewportRect(
  areaX: number,
  areaY: number,
  available: number,
  centerX: number,
  centerY: number,
  zoom: number,
): ViewportRect {
  const sourceSize = 144 / zoom,
    idealScale = available / sourceSize,
    settled = Math.abs(zoom - Math.round(zoom)) < 0.0001,
    scale = settled ? Math.max(1, Math.floor(idealScale)) : idealScale,
    size = Math.floor(sourceSize * scale),
    x = Math.floor(areaX + (available - size) / 2),
    y = Math.floor(areaY + (available - size) / 2);
  return {
    x,
    y,
    size,
    sourceX: centerX - sourceSize / 2,
    sourceY: centerY - sourceSize / 2,
    sourceSize,
    scale,
  };
}
export function screenToWorld(
  view: ViewportRect,
  x: number,
  y: number,
): { x: number; y: number } | null {
  if (
    x < view.x ||
    y < view.y ||
    x >= view.x + view.size ||
    y >= view.y + view.size
  )
    return null;
  return {
    x: view.sourceX + (x - view.x) / view.scale,
    y: view.sourceY + (y - view.y) / view.scale,
  };
}
