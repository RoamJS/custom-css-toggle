// @vitest-environment jsdom
import React from "react";
import ReactDOM from "react-dom";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import Popout from "../src/Popout";
import { PopoutBounds } from "../src/popoutGeometry";

let root: HTMLDivElement;
const original = { x: 60, y: 70, width: 600, height: 500 };
const saved = vi.fn();
const closed = vi.fn();
const render = (
  props: Partial<React.ComponentProps<typeof Popout>> = {},
): void => {
  act(() => {
    ReactDOM.render(
      <Popout
        bounds={original}
        cancelEpoch={0}
        onBoundsChange={saved}
        onClose={closed}
        {...props}
      >
        <div className="cct-shell">Editor contents</div>
      </Popout>,
      root,
    );
  });
};
const handle = (name = "Move CSS editor"): HTMLElement =>
  document.querySelector(`[aria-label="${name}"]`)!;
const displayed = (): PopoutBounds => {
  const element = document.querySelector<HTMLElement>(".cct-popout")!;
  return {
    x: parseFloat(element.style.left),
    y: parseFloat(element.style.top),
    width: parseFloat(element.style.width),
    height: parseFloat(element.style.height),
  };
};
const pointer = (target: EventTarget, type: string, x = 100, y = 110): void => {
  act(() => {
    target.dispatchEvent(
      new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
        button: 0,
      }),
    );
  });
};
const key = (target: EventTarget, value: string, shiftKey = false): void => {
  act(() => {
    target.dispatchEvent(
      new KeyboardEvent("keydown", {
        bubbles: true,
        cancelable: true,
        key: value,
        shiftKey,
      }),
    );
  });
};
const viewport = (width: number, height: number): void => {
  vi.stubGlobal("innerWidth", width);
  vi.stubGlobal("innerHeight", height);
};

beforeEach(() => {
  saved.mockReset();
  closed.mockReset();
  viewport(1200, 900);
  root = document.createElement("div");
  document.body.append(root);
});
afterEach(() => {
  act(() => {
    ReactDOM.unmountComponentAtNode(root);
  });
  root.remove();
  vi.unstubAllGlobals();
});

it("uses Roam's modal host and removes only its own portal on unmount", () => {
  const host = document.createElement("div");
  host.className = "roam-lift-modal";
  const nativeContent = document.createElement("div");
  host.append(nativeContent);
  document.body.append(host);
  try {
    render();
    const portal = document.querySelector(".cct-popout-portal");
    expect(portal?.parentElement).toBe(host);
    expect(portal?.querySelector(".cct-popout")).not.toBeNull();
    act(() => {
      ReactDOM.unmountComponentAtNode(root);
    });
    expect(document.querySelector(".cct-popout-portal")).toBeNull();
    expect(host.isConnected).toBe(true);
    expect([...host.children]).toEqual([nativeContent]);
  } finally {
    host.remove();
  }
});

it("previews movement and saves the release position once through the latest callback", () => {
  render();
  expect(root.querySelector(".cct-popout")).toBeNull();
  expect(document.querySelector(".cct-popout-content")?.textContent).toBe(
    "Editor contents",
  );
  pointer(handle(), "pointerdown");
  pointer(window, "pointermove", 200, 210);
  expect(displayed()).toEqual({ ...original, x: 160, y: 170 });
  expect(saved).not.toHaveBeenCalled();
  const latest = vi.fn();
  render({ onBoundsChange: latest });
  pointer(window, "pointerup", 220, 230);
  const result = { ...original, x: 180, y: 190 };
  expect(saved).not.toHaveBeenCalled();
  expect(latest).toHaveBeenCalledExactlyOnceWith(result);
  render({ bounds: result });
  expect(displayed()).toEqual(result);
  pointer(window, "pointermove", 400, 500);
  pointer(window, "pointerup", 400, 500);
  expect(latest).toHaveBeenCalledTimes(1);
});

it("resizes from the bottom-right within the viewport and minimum dimensions", () => {
  render();
  pointer(handle("Resize popout"), "pointerdown");
  pointer(window, "pointermove", 2000, 2000);
  const largest = { ...original, width: 1128, height: 818 };
  expect(displayed()).toEqual(largest);
  expect(saved).not.toHaveBeenCalled();
  pointer(window, "pointerup", 2000, 2000);
  expect(saved).toHaveBeenLastCalledWith(largest);
  render({ bounds: largest });
  pointer(handle("Resize popout"), "pointerdown");
  pointer(window, "pointerup", -2000, -2000);
  expect(saved).toHaveBeenLastCalledWith({
    ...original,
    width: 480,
    height: 320,
  });
});

it("moves and resizes from the keyboard with a larger Shift step", () => {
  render();
  key(handle(), "ArrowRight");
  const moved = { ...original, x: 70 };
  expect(saved).toHaveBeenLastCalledWith(moved);
  render({ bounds: moved });
  key(handle("Resize popout"), "ArrowDown", true);
  expect(saved).toHaveBeenLastCalledWith({ ...moved, height: 540 });
  key(handle("Resize popout"), "Tab");
  expect(saved).toHaveBeenCalledTimes(2);
});

it.each(["pointercancel", "blur", "Escape", "pause"])(
  "cancels a gesture on %s and never persists a later pointerup",
  (reason) => {
    render();
    pointer(handle(), "pointerdown");
    pointer(window, "pointermove", 200, 210);
    expect(displayed().x).toBe(160);
    if (reason === "pause") render({ cancelEpoch: 1 });
    else if (reason === "Escape") key(window, "Escape");
    else
      act(() => {
        window.dispatchEvent(new Event(reason));
      });
    expect(displayed()).toEqual(original);
    pointer(window, "pointermove", 400, 500);
    pointer(window, "pointerup", 400, 500);
    expect(saved).not.toHaveBeenCalled();
    expect(closed).not.toHaveBeenCalled();
  },
);

it("cancels and removes gesture listeners on unmount", () => {
  render();
  pointer(handle("Resize popout"), "pointerdown");
  pointer(window, "pointermove", 300, 310);
  act(() => {
    ReactDOM.unmountComponentAtNode(root);
  });
  pointer(window, "pointerup", 300, 310);
  expect(saved).not.toHaveBeenCalled();
  expect(document.querySelector(".cct-popout")).toBeNull();
});

it("clamps after viewport changes without overwriting the preferred persisted bounds", () => {
  render();
  pointer(handle(), "pointerdown");
  pointer(window, "pointermove", 200, 210);
  viewport(400, 300);
  act(() => {
    window.dispatchEvent(new Event("resize"));
  });
  expect(displayed()).toEqual({ x: 12, y: 12, width: 376, height: 276 });
  pointer(window, "pointerup", 200, 210);
  expect(saved).not.toHaveBeenCalled();
  viewport(1200, 900);
  act(() => {
    window.dispatchEvent(new Event("resize"));
  });
  expect(displayed()).toEqual(original);
});

it("closes with the latest callback and cancels any active gesture", () => {
  render();
  pointer(handle(), "pointerdown");
  pointer(window, "pointermove", 200, 210);
  const latest = vi.fn();
  render({ onClose: latest });
  act(() => handle("Close").click());
  pointer(window, "pointerup", 200, 210);
  expect(saved).not.toHaveBeenCalled();
  expect(closed).not.toHaveBeenCalled();
  expect(latest).toHaveBeenCalledTimes(1);
});
