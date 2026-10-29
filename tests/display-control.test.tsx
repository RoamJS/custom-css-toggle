// @vitest-environment jsdom
import React from "react";
import ReactDOM from "react-dom";
import { act, Simulate } from "react-dom/test-utils";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import App from "../src/App";
import { readDeclarations } from "../src/css";
import { emptyLibrary } from "../src/model";

let root: HTMLDivElement;
const apply = vi.fn();
const save = vi.fn();
const render = (css: string): void => {
  let open = (): void => undefined;
  act(() => {
    ReactDOM.render(
      <App
        initial={{
          ...emptyLibrary(),
          sheets: [{ id: "sheet", name: "Test", css, enabled: false }],
        }}
        apply={apply}
        save={save}
        register={(handlers) => {
          open = handlers.open;
        }}
      />,
      root,
    );
  });
  act(() => open());
  change(document.querySelector<HTMLInputElement>("#cct-selector")!, ".title");
};
const change = (
  element: HTMLInputElement | HTMLSelectElement,
  value: string,
): void => {
  act(() => {
    element.value = value;
    Simulate.change(element);
  });
};
const display = (): HTMLSelectElement =>
  document.querySelector("#cct-display")!;
const previewCss = (): string => apply.mock.calls.at(-1)?.[1]?.css;

beforeEach(() => {
  apply.mockReset();
  save.mockReset();
  root = document.createElement("div");
  document.body.append(root);
  vi.stubGlobal("CSS", { supports: () => true });
  vi.stubGlobal(
    "ResizeObserver",
    class {
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

it("opens without writing a display override, then hides and restores the selected elements", () => {
  const original = ".title { color: blue; } .other { display: flex; }";
  render(original);
  expect(display().value).toBe("");
  expect(display().selectedOptions[0].textContent).toBe("Use page style");
  expect(previewCss()).toBe(original);
  expect(save).not.toHaveBeenCalled();

  change(display(), "none");
  expect(display().value).toBe("none");
  expect(previewCss()).toContain("display: none !important");
  expect(readDeclarations({ css: previewCss(), selector: ".title" })).toEqual({
    color: "blue",
    display: "none",
  });
  expect(document.querySelector<HTMLInputElement>("#cct-selector")!.value).toBe(
    ".title",
  );

  change(display(), "");
  expect(readDeclarations({ css: previewCss(), selector: ".title" })).toEqual({
    color: "blue",
  });
  expect(previewCss()).toContain(".other { display: flex; }");
  expect(save).not.toHaveBeenCalled();
});

it("represents an existing custom display value without replacing it on mount", () => {
  const original = ".title { display: var(--custom-layout); color: blue; }";
  render(original);
  expect(display().value).toBe("var(--custom-layout)");
  expect(display().selectedOptions[0].textContent).toBe("var(--custom-layout)");
  expect(previewCss()).toBe(original);
  expect(save).not.toHaveBeenCalled();

  change(display(), "none");
  expect(previewCss()).toContain("display: none !important");
  change(display(), "");
  expect(readDeclarations({ css: previewCss(), selector: ".title" })).toEqual({
    color: "blue",
  });
});
