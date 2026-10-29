// @vitest-environment jsdom
import React from "react";
import ReactDOM from "react-dom";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import LibraryPanel from "../src/LibraryPanel";
import { emptyLibrary, readLibrary } from "../src/model";

let root: HTMLDivElement;
let available: number;
let measure: () => void;
const saved = vi.fn();
const render = (cancelEpoch = 0): void => {
  act(() => {
    ReactDOM.render(
      <LibraryPanel size={200} onResize={saved} cancelEpoch={cancelEpoch}>
        A long stylesheet title
      </LibraryPanel>,
      root,
    );
  });
};
const separator = (): HTMLElement => root.querySelector('[role="separator"]')!;
const pointer = (target: EventTarget, type: string, x: number): void => {
  act(() => {
    target.dispatchEvent(
      new MouseEvent(type, { bubbles: true, clientX: x, button: 0 }),
    );
  });
};

beforeEach(() => {
  saved.mockReset();
  available = 800;
  root = document.createElement("div");
  root.getBoundingClientRect = () => ({ width: available }) as DOMRect;
  document.body.append(root);
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(callback: () => void) {
        measure = callback;
      }
      observe(): void {}
      disconnect(): void {}
    },
  );
});
afterEach(() => {
  act(() => {
    ReactDOM.unmountComponentAtNode(root);
  });
  root.remove();
  vi.unstubAllGlobals();
});

it("previews a drag and saves only its final width", () => {
  render();
  pointer(separator(), "pointerdown", 200);
  pointer(window, "pointermove", 320);
  expect(separator().getAttribute("aria-valuenow")).toBe("320");
  expect(saved).not.toHaveBeenCalled();
  pointer(window, "pointerup", 320);
  expect(saved).toHaveBeenCalledExactlyOnceWith(320);
});

it("cancels a drag on emergency pause without a delayed save", () => {
  render();
  pointer(separator(), "pointerdown", 200);
  pointer(window, "pointermove", 320);
  render(1);
  pointer(window, "pointermove", 400);
  pointer(window, "pointerup", 400);
  expect(saved).not.toHaveBeenCalled();
  expect(separator().getAttribute("aria-valuenow")).toBe("200");
});

it("removes drag listeners when the editor unmounts", () => {
  render();
  pointer(separator(), "pointerdown", 200);
  act(() => {
    ReactDOM.unmountComponentAtNode(root);
  });
  pointer(window, "pointermove", 400);
  pointer(window, "pointerup", 400);
  expect(saved).not.toHaveBeenCalled();
});

it("supports keyboard resizing and reserves room for the editor", () => {
  render();
  act(() => {
    separator().dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, key: "ArrowRight" }),
    );
  });
  expect(saved).toHaveBeenLastCalledWith(224);
  available = 440;
  act(() => {
    measure();
  });
  expect(separator().getAttribute("aria-valuenow")).toBe("194");
  act(() => {
    separator().dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, key: "End" }),
    );
  });
  expect(saved).toHaveBeenLastCalledWith(194);
  available = 800;
  act(() => {
    measure();
  });
  expect(separator().getAttribute("aria-valuenow")).toBe("200");
});

it("reads older libraries and preserves saved widths without losing styles", () => {
  const original = {
    ...emptyLibrary(),
    sheets: [
      { id: "old", name: "Existing", css: "h1 {color:red}", enabled: true },
    ],
  };
  const { librarySize, ...legacy } = original;
  expect(readLibrary(JSON.stringify(legacy))).toEqual(original);
  expect(
    readLibrary(JSON.stringify({ ...original, librarySize: 360 })),
  ).toEqual({ ...original, librarySize: 360 });
  expect(
    readLibrary(JSON.stringify({ ...original, librarySize: -12 })).librarySize,
  ).toBe(120);
  expect(
    readLibrary(JSON.stringify({ ...original, librarySize: 900 })).librarySize,
  ).toBe(480);
});
