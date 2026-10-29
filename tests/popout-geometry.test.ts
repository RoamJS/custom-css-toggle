import { describe, expect, it } from "vitest";
import {
  clampPopoutBounds,
  DEFAULT_POPOUT_BOUNDS,
  sanitizePopoutBounds,
} from "../src/popoutGeometry";

describe("saved popout bounds", () => {
  it("uses defaults for missing or invalid values without a browser", () => {
    expect(sanitizePopoutBounds(null)).toEqual(DEFAULT_POPOUT_BOUNDS);
    expect(sanitizePopoutBounds([])).toEqual(DEFAULT_POPOUT_BOUNDS);
    expect(
      sanitizePopoutBounds({ x: NaN, y: Infinity, width: "600", height: null }),
    ).toEqual(DEFAULT_POPOUT_BOUNDS);
  });

  it("preserves valid geometry through JSON persistence and enforces minimums", () => {
    const saved = { x: 345, y: 120, width: 860, height: 720 };
    expect(sanitizePopoutBounds(JSON.parse(JSON.stringify(saved)))).toEqual(
      saved,
    );
    expect(
      sanitizePopoutBounds({ x: -10, y: -20, width: 1, height: 0 }),
    ).toEqual({
      x: 12,
      y: 12,
      width: 480,
      height: 320,
    });
  });
});

describe("viewport bounds", () => {
  it("keeps offscreen saved windows reachable without changing the saved size", () => {
    const bounds = { x: 1500, y: 1000, width: 600, height: 500 };
    expect(
      clampPopoutBounds({ bounds, viewport: { width: 1200, height: 900 } }),
    ).toEqual({ x: 588, y: 388, width: 600, height: 500 });
    expect(bounds).toEqual({ x: 1500, y: 1000, width: 600, height: 500 });
  });

  it("shrinks below minimums on small screens while retaining a margin", () => {
    expect(
      clampPopoutBounds({
        bounds: DEFAULT_POPOUT_BOUNDS,
        viewport: { width: 360, height: 260 },
      }),
    ).toEqual({ x: 12, y: 12, width: 336, height: 236 });
    expect(
      clampPopoutBounds({
        bounds: DEFAULT_POPOUT_BOUNDS,
        viewport: { width: 0, height: 0 },
      }),
    ).toEqual({ x: 0, y: 0, width: 0, height: 0 });
  });
});
