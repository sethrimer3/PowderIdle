export interface ResponsiveGameLayout {
  screenWidth: number;
  screenHeight: number;
  menuWidth: number;
  playWidth: number;
  stageViewportSize: number;
  menuScale: number;
  verticalScale: number;
}

export function computeResponsiveGameLayout(
  windowWidth: number,
  windowHeight: number,
  margin = 24,
): ResponsiveGameLayout {
  const screenWidth = Math.round(Math.max(360, windowWidth - margin));
  const screenHeight = Math.round(Math.max(640, windowHeight - margin));
  const menuWidth = Math.round(screenWidth / 2);
  const playWidth = screenWidth - menuWidth;
  return {
    screenWidth,
    screenHeight,
    menuWidth,
    playWidth,
    stageViewportSize: Math.min(playWidth, screenHeight),
    menuScale: Math.max(0.72, Math.min(1.8, menuWidth / 360)),
    verticalScale: Math.max(0.85, Math.min(1.8, screenHeight / 640)),
  };
}
