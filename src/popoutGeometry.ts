export type PopoutBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};
export const DEFAULT_POPOUT_BOUNDS: PopoutBounds = {
  x: 80,
  y: 80,
  width: 720,
  height: 640,
};
export const POPOUT_MARGIN = 12;
export const MIN_POPOUT_WIDTH = 480;
export const MIN_POPOUT_HEIGHT = 320;

const finiteNumber = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

export const sanitizePopoutBounds = (value: unknown): PopoutBounds => {
  const saved =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Partial<Record<keyof PopoutBounds, unknown>>)
      : {};
  return {
    x: Math.max(POPOUT_MARGIN, finiteNumber(saved.x, DEFAULT_POPOUT_BOUNDS.x)),
    y: Math.max(POPOUT_MARGIN, finiteNumber(saved.y, DEFAULT_POPOUT_BOUNDS.y)),
    width: Math.max(
      MIN_POPOUT_WIDTH,
      finiteNumber(saved.width, DEFAULT_POPOUT_BOUNDS.width),
    ),
    height: Math.max(
      MIN_POPOUT_HEIGHT,
      finiteNumber(saved.height, DEFAULT_POPOUT_BOUNDS.height),
    ),
  };
};

export const clampPopoutBounds = ({
  bounds,
  viewport,
}: {
  bounds: PopoutBounds;
  viewport: { width: number; height: number };
}): PopoutBounds => {
  const saved = sanitizePopoutBounds(bounds);
  const viewportWidth = Math.max(0, finiteNumber(viewport.width, 0));
  const viewportHeight = Math.max(0, finiteNumber(viewport.height, 0));
  const marginX = Math.min(POPOUT_MARGIN, viewportWidth / 2);
  const marginY = Math.min(POPOUT_MARGIN, viewportHeight / 2);
  const width = Math.min(saved.width, viewportWidth - 2 * marginX);
  const height = Math.min(saved.height, viewportHeight - 2 * marginY);
  return {
    x: Math.max(marginX, Math.min(saved.x, viewportWidth - marginX - width)),
    y: Math.max(marginY, Math.min(saved.y, viewportHeight - marginY - height)),
    width,
    height,
  };
};
