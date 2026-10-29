// @vitest-environment jsdom
import React from "react";
import ReactDOM from "react-dom";
import { act, Simulate } from "react-dom/test-utils";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import App, { EditorHandlers } from "../src/App";
import { createShortcutLabel, emptyLibrary, readLibrary } from "../src/model";

vi.mock("../src/CodeEditor", () => ({
  default: ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (value: string) => void;
  }): React.ReactElement => (
    <textarea
      aria-label="Test CSS source"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));
let root: HTMLDivElement;
let handlers: EditorHandlers;
const apply = vi.fn();
const save = vi.fn();
const original = ".title { color: blue; }";
const changed = ".title { color: red; }";
const click = (label: string): void => {
  const button = Array.from(
    document.querySelectorAll<HTMLButtonElement>("button"),
  ).find(
    (el) => el.getAttribute("aria-label") === label || el.textContent === label,
  );
  expect(button).toBeTruthy();
  act(() => Simulate.click(button!));
};
const preview = (): HTMLInputElement =>
  document.querySelector(".cct-preview-row input")!;
const toggleSheet = (): void => {
  act(() =>
    Simulate.change(document.querySelector('[aria-label="Enable Test"]')!),
  );
};
const edit = (css: string): void => {
  const source = document.querySelector<HTMLTextAreaElement>(
    '[aria-label="Test CSS source"]',
  )!;
  act(() => {
    source.value = css;
    Simulate.change(source);
  });
};
const render = ({ enabled = true, suspended = false } = {}): void => {
  let open = (): void => undefined;
  act(() => {
    ReactDOM.render(
      <App
        initial={{
          ...emptyLibrary(),
          sheets: [{ id: "s", name: "Test", css: original, enabled }],
          suspended,
        }}
        apply={apply}
        save={save}
        register={(next) => {
          handlers = next;
          open = next.open;
        }}
      />,
      root,
    );
  });
  act(() => open());
  act(() =>
    Simulate.click(
      document.querySelector("#bp3-tab-title_cct-editor-tabs_source")!,
    ),
  );
};
const latestPreview = (): { id: string; css: string } | undefined =>
  apply.mock.calls.at(-1)?.[1];
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
it("previews enabled edits optionally, reverts, and discards without saving", () => {
  render();
  expect(preview().disabled).toBe(false);
  expect(preview().checked).toBe(true);
  edit(changed);
  expect(latestPreview()?.css).toBe(changed);
  expect(save).not.toHaveBeenCalled();
  click("Revert");
  expect(latestPreview()?.css).toBe(original);
  edit(changed);
  click("Close");
  click("Discard / continue");
  expect(latestPreview()).toBeUndefined();
  expect(apply.mock.calls.at(-1)?.[0].sheets[0].css).toBe(original);
  expect(save).not.toHaveBeenCalled();
});
it("turning a stylesheet off stops its automatic preview until explicitly requested", () => {
  render();
  edit(changed);
  toggleSheet();
  expect(preview().disabled).toBe(false);
  expect(preview().checked).toBe(false);
  expect(latestPreview()).toBeUndefined();
  act(() => Simulate.change(preview()));
  expect(latestPreview()?.css).toBe(changed);
  toggleSheet();
  expect(preview().disabled).toBe(false);
  toggleSheet();
  expect(preview().checked).toBe(false);
  expect(latestPreview()).toBeUndefined();
});
it("keeps disabled preview optional and Save does not enable the sheet", () => {
  render({ enabled: false });
  expect(preview().disabled).toBe(false);
  act(() => Simulate.change(preview()));
  edit(changed);
  expect(latestPreview()).toBeUndefined();
  click("Save");
  expect(save.mock.calls.at(-1)?.[0].sheets[0]).toMatchObject({
    css: changed,
    enabled: false,
  });
});
it("suspension stops preview and resume restores saved styles until preview is requested", () => {
  render();
  edit(changed);
  click("Pause all");
  expect(preview().disabled).toBe(true);
  expect(preview().checked).toBe(false);
  expect(latestPreview()).toBeUndefined();
  click("Resume CSS");
  expect(latestPreview()).toBeUndefined();
  act(() => Simulate.change(preview()));
  expect(latestPreview()?.css).toBe(changed);
  edit(".title {");
  expect(latestPreview()).toBeUndefined();
  expect(document.querySelector('[role="status"]')?.textContent).toContain(
    "showing saved styles",
  );
  expect(apply.mock.calls.at(-1)?.[0].sheets[0].css).toBe(original);
});
it("keeps unsaved source through popout and dock changes and downloads with the new icon", () => {
  render();
  edit(changed);
  click("Popout");
  expect(document.querySelector('[aria-label="Move CSS editor"]')).toBeTruthy();
  expect(
    document.querySelector<HTMLTextAreaElement>(
      '[aria-label="Test CSS source"]',
    )?.value,
  ).toBe(changed);
  click("Dock bottom");
  expect(
    document.querySelector<HTMLTextAreaElement>(
      '[aria-label="Test CSS source"]',
    )?.value,
  ).toBe(changed);
  expect(save.mock.calls.at(-1)?.[0].sheets[0].css).toBe(original);
  expect(
    document.querySelector(
      '[aria-label="Export CSS file"] [data-icon="download"]',
    ),
  ).toBeTruthy();
});
it("migrates old libraries to safe popout defaults and remembers valid popout bounds", () => {
  const { popoutBounds, ...old } = emptyLibrary();
  expect(readLibrary(JSON.stringify(old)).popoutBounds).toEqual(popoutBounds);
  const next = {
    ...old,
    dock: "popout",
    popoutBounds: { x: 30, y: 40, width: 700, height: 500 },
  };
  expect(readLibrary(JSON.stringify(next))).toMatchObject(next);
});

it("global pause, unpause and toggle are distinct and retain per-sheet enabled flags", () => {
  render();
  edit(changed);
  act(() => {
    handlers.emergency();
    handlers.emergency();
  });
  expect(apply.mock.calls.at(-1)?.[0].suspended).toBe(true);
  act(() => {
    handlers.unpause();
    handlers.unpause();
  });
  expect(apply.mock.calls.at(-1)?.[0].suspended).toBe(false);
  expect(latestPreview()).toBeUndefined();
  act(() => {
    handlers.toggleAll();
    handlers.toggleAll();
  });
  expect(apply.mock.calls.at(-1)?.[0].suspended).toBe(false);
  expect(apply.mock.calls.at(-1)?.[0].sheets[0]).toMatchObject({
    enabled: true,
    css: original,
  });
});
it("stylesheet commands stop selected preview when disabled and never unpause globally", () => {
  render();
  edit(changed);
  act(() => handlers.toggleSheet("s"));
  expect(latestPreview()).toBeUndefined();
  expect(preview().checked).toBe(false);
  act(() => handlers.emergency());
  act(() => handlers.toggleSheet("s"));
  expect(apply.mock.calls.at(-1)?.[0]).toMatchObject({
    suspended: true,
    sheets: [{ enabled: true }],
  });
  expect(latestPreview()).toBeUndefined();
  const count = save.mock.calls.length;
  act(() => handlers.toggleSheet("deleted"));
  expect(save).toHaveBeenCalledTimes(count);
});
it("adding a shortcut keeps the draft unsaved and retains its command name after a rename", () => {
  render();
  edit(changed);
  act(() => {
    const input = document.querySelector<HTMLInputElement>(
      ".cct-sheet-shortcut input",
    )!;
    input.checked = true;
    Simulate.change(input);
  });
  const shortcut = save.mock.calls.at(-1)?.[0].sheets[0].shortcut;
  expect(shortcut).toMatchObject({ enabled: true });
  expect(shortcut.label).toContain("Test");
  expect(save.mock.calls.at(-1)?.[0].sheets[0].css).toBe(original);
  const name = document.querySelector<HTMLInputElement>(
    '[aria-label="Stylesheet name"]',
  )!;
  act(() => {
    name.value = "Renamed";
    Simulate.change(name);
  });
  click("Save");
  expect(save.mock.calls.at(-1)?.[0].sheets[0]).toMatchObject({
    name: "Renamed",
    css: changed,
    shortcut,
  });
});
it("uses numeric suffixes only for duplicate command names", () => {
  const first = {
    id: "first12345678",
    name: "Reading",
    enabled: false,
    css: "",
  };
  const second = { ...first, id: "second12345678" };
  const label = createShortcutLabel({ sheet: first, sheets: [first, second] });
  const sheets = [{ ...first, shortcut: { label, enabled: true } }, second];
  expect(label).toBe("Custom CSS Toggle: Toggle stylesheet Reading");
  expect(createShortcutLabel({ sheet: second, sheets })).toBe(`${label} (2)`);
  expect(
    readLibrary(JSON.stringify({ ...emptyLibrary(), sheets })).sheets[0]
      .shortcut?.label,
  ).toBe(label);
  expect(() =>
    readLibrary(
      JSON.stringify({
        ...emptyLibrary(),
        sheets: [sheets[0], { ...second, shortcut: { label, enabled: true } }],
      }),
    ),
  ).toThrow();
});

it("turning preview off compares saved enabled CSS without losing unsaved changes", () => {
  render();
  edit(changed);
  act(() => Simulate.change(preview()));
  expect(preview().disabled).toBe(false);
  expect(latestPreview()).toBeUndefined();
  expect(apply.mock.calls.at(-1)?.[0].sheets[0]).toMatchObject({
    css: original,
    enabled: true,
  });
  expect(document.querySelector('[role="status"]')?.textContent).toBe(
    "Showing saved styles · Unsaved",
  );
  act(() => Simulate.change(preview()));
  expect(latestPreview()?.css).toBe(changed);
  expect(save).not.toHaveBeenCalled();
});

it("saves and reloads descriptions with the sheet while preserving CSS", () => {
  render();
  const details =
    document.querySelector<HTMLDetailsElement>(".cct-description")!;
  expect(details.open).toBe(false);
  act(() => details.querySelector("summary")!.click());
  expect(details.open).toBe(true);
  const field = document.querySelector<HTMLTextAreaElement>(
    '[aria-label="Stylesheet description"]',
  )!;
  act(() => {
    field.value = "Hide the sidebar logo on this browser.";
    Simulate.change(field);
  });
  expect(save).not.toHaveBeenCalled();
  click("Save");
  const saved = save.mock.calls.at(-1)?.[0];
  expect(saved.sheets[0]).toMatchObject({
    css: original,
    description: field.value,
  });
  expect(readLibrary(JSON.stringify(saved)).sheets[0].description).toBe(
    field.value,
  );
  act(() => {
    field.value = "Unsaved note";
    Simulate.change(field);
  });
  click("Revert");
  expect(field.value).toBe("Hide the sidebar logo on this browser.");
});
it("guards unsaved descriptions and discards them only after confirmation", () => {
  render();
  const field = document.querySelector<HTMLTextAreaElement>(
    '[aria-label="Stylesheet description"]',
  )!;
  act(() => {
    field.value = "Unsaved note";
    Simulate.change(field);
  });
  click("Close");
  expect(document.querySelector(".bp3-alert")).toBeTruthy();
  click("Cancel");
  expect(field.value).toBe("Unsaved note");
  expect(save).not.toHaveBeenCalled();
  click("Close");
  click("Discard / continue");
  expect(latestPreview()).toBeUndefined();
  act(() => handlers.open());
  expect(
    document.querySelector<HTMLTextAreaElement>(
      '[aria-label="Stylesheet description"]',
    )!.value,
  ).toBe("");
});

it("keeps title, dock controls, pause and close in one header for docked and floating editors", () => {
  render();
  const check = (): void => {
    const headers = document.querySelectorAll(".cct-editor-header");
    expect(headers).toHaveLength(1);
    const header = headers[0];
    expect(header.textContent).toContain("Custom CSS Toggle");
    expect(header.querySelector('[aria-label="Editor position"]')).toBeTruthy();
    expect(
      Array.from(header.querySelectorAll("button")).some(
        (b) => b.textContent === "Pause all",
      ),
    ).toBe(true);
    expect(header.querySelector('[aria-label="Close"]')).toBeTruthy();
    expect(document.querySelector(".bp3-drawer-header")).toBeNull();
    expect(document.querySelectorAll(".cct-toolbar")).toHaveLength(1);
  };
  check();
  click("Popout");
  check();
  expect(
    document.querySelector('.cct-editor-header [aria-label="Move CSS editor"]'),
  ).toBeTruthy();
  click("Dock right");
  check();
});

it("mounts docked editors in Roam's modal host without removing native content", () => {
  const host = document.createElement("div");
  host.className = "roam-lift-modal";
  const native = document.createElement("div");
  host.append(native);
  document.body.append(host);
  try {
    render();
    expect(host.querySelector(".cct-drawer")).not.toBeNull();
    act(() => {
      ReactDOM.unmountComponentAtNode(root);
    });
    expect(host.querySelector(".cct-drawer")).toBeNull();
    expect([...host.children]).toEqual([native]);
  } finally {
    host.remove();
  }
});
