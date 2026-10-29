// @vitest-environment jsdom
import React from "react";
import ReactDOM from "react-dom";
import { act, Simulate } from "react-dom/test-utils";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import SheetShortcut from "../src/SheetShortcut";
import { Stylesheet } from "../src/model";

let root: HTMLDivElement;
const changed = vi.fn();
const original: Stylesheet = {
  id: "s",
  name: "Reading",
  css: "",
  enabled: false,
};
const render = (sheet = original): void => {
  act(() => {
    ReactDOM.render(<SheetShortcut sheet={sheet} onChange={changed} />, root);
  });
};
beforeEach(() => {
  changed.mockReset();
  root = document.createElement("div");
  document.body.append(root);
});
afterEach(() => {
  act(() => {
    ReactDOM.unmountComponentAtNode(root);
  });
  root.remove();
});
it("shows only the named switch and opts in on request", () => {
  render();
  expect(root.querySelector("button")).toBeNull();
  expect(root.querySelector("section")).toBeNull();
  const input = root.querySelector("input")!;
  expect(input.closest("label")?.textContent).toBe(
    "Enable Command Palette Shortcut",
  );
  expect(input.checked).toBe(false);
  expect(changed).not.toHaveBeenCalled();
  act(() => {
    input.checked = true;
    Simulate.change(input);
  });
  expect(changed).toHaveBeenCalledExactlyOnceWith(true);
});
it("uses the current saved shortcut state without showing command details", () => {
  render({
    ...original,
    shortcut: {
      label: "Custom CSS Toggle: Toggle stylesheet Reading",
      enabled: true,
    },
  });
  const input = root.querySelector("input")!;
  expect(input.checked).toBe(true);
  expect(root.querySelector("code")).toBeNull();
  act(() => {
    input.checked = false;
    Simulate.change(input);
  });
  expect(changed).toHaveBeenCalledExactlyOnceWith(false);
  render({
    ...original,
    shortcut: {
      label: "Custom CSS Toggle: Toggle stylesheet Reading",
      enabled: false,
    },
  });
  expect(root.querySelector("input")!.checked).toBe(false);
});
