// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import cssesc from "cssesc";
import {
  applyStyles,
  emptyLibrary,
  readLibrary,
  storageKey,
} from "../src/model";
import { getSelector, startPicker } from "../src/picker";
import {
  readDeclarations,
  updateDeclaration,
  validateCss,
  validateSelector,
} from "../src/css";

beforeEach(() => {
  document.body.replaceChildren();
  Object.defineProperty(globalThis, "CSS", {
    configurable: true,
    value: { escape: (value: string) => cssesc(value, { isIdentifier: true }) },
  });
});
const sheet = {
  id: "s",
  name: "Reading",
  enabled: true,
  css: ".title { color: blue; }",
};
describe("personal library", () => {
  it("isolates every graph/user pair, including separators", () => {
    const keys = [
      storageKey({ graph: "one", user: "a" }),
      storageKey({ graph: "two", user: "a" }),
      storageKey({ graph: "one", user: "b" }),
      storageKey({ graph: "one:a", user: "b" }),
    ];
    expect(new Set(keys).size).toBe(4);
    expect(() => storageKey({ graph: "one", user: "" })).toThrow();
  });
  it("round-trips multiple saved states and rejects corrupt data", () => {
    const library = { ...emptyLibrary(), sheets: [sheet], suspended: true };
    expect(readLibrary(JSON.stringify(library))).toEqual(library);
    expect(() => readLibrary('{"version":2}')).toThrow();
    expect(() =>
      readLibrary(JSON.stringify({ ...library, sheets: [sheet, sheet] })),
    ).toThrow();
    expect(readLibrary(null).sheets).toEqual([]);
  });
  it("applies only enabled styles in order; preview is temporary; pause removes everything", () => {
    const host = document.createElement("div");
    document.body.append(host);
    const library = {
      ...emptyLibrary(),
      sheets: [
        sheet,
        { ...sheet, id: "second", enabled: false, css: "body {color:red}" },
      ],
    };
    applyStyles({ host, library });
    expect(host.children).toHaveLength(1);
    applyStyles({
      host,
      library,
      preview: { id: "second", css: "body {color:green}" },
    });
    expect(Array.from(host.children).map((e) => e.textContent)).toEqual([
      sheet.css,
      "body {color:green}",
    ]);
    applyStyles({ host, library });
    expect(host.textContent).toBe(sheet.css);
    applyStyles({
      host,
      library: { ...library, suspended: true },
      preview: { id: "s", css: "* {display:none}" },
    });
    expect(host.children).toHaveLength(0);
  });
  it("uses text content so CSS cannot inject HTML", () => {
    const host = document.createElement("div");
    document.body.append(host);
    applyStyles({
      host,
      library: {
        ...emptyLibrary(),
        sheets: [
          { ...sheet, css: "/* </style><img src=x onerror=alert(1)> */" },
        ],
      },
    });
    expect(host.querySelector("img")).toBeNull();
  });
});
describe("visual CSS editing", () => {
  it("lets explicit visual edits override theme specificity without changing other declarations", () => {
    const changed = updateDeclaration({
      css: ".rm-title-display { padding: 4px; } .other { color: black; }",
      selector: ".rm-title-display",
      property: "color",
      value: "red",
      forceImportant: true,
    });
    expect(changed).toContain("color: red !important");
    expect(changed).toContain("padding: 4px;");
    expect(changed).toContain(".other { color: black; }");
    expect(
      updateDeclaration({
        css: changed,
        selector: ".rm-title-display",
        property: "color",
        value: "",
        forceImportant: true,
      }),
    ).not.toContain("!important");
  });
  it("edits matching top-level declarations and preserves unrelated/nested rules", () => {
    const css =
      ".title { color: blue !important; } @media (min-width: 800px) { .title { color: green; } } .other { color: black; }";
    const changed = updateDeclaration({
      css,
      selector: ".title",
      property: "color",
      value: "red",
    });
    expect(readDeclarations({ css: changed, selector: ".title" }).color).toBe(
      "red",
    );
    expect(changed).toContain("color: green");
    expect(changed).toContain("color: black");
    expect(changed).toContain("red !important");
  });
  it("clears properties across duplicate top-level selectors", () => {
    const css =
      ".foo { color: red; } .foo { font-size: 16px; } @media print { .foo { color: black; } }";
    const changed = updateDeclaration({
      css,
      selector: ".foo",
      property: "color",
      value: "",
    });
    expect(
      readDeclarations({ css: changed, selector: ".foo" }).color,
    ).toBeUndefined();
    expect(changed).toContain("font-size: 16px");
    expect(changed).toContain("color: black");
  });
  it("honors and preserves important values across duplicate selectors", () => {
    const css =
      ".foo { color: red !important; } .foo { color: blue; padding: 4px; }";
    expect(readDeclarations({ css, selector: ".foo" }).color).toBe("red");
    const changed = updateDeclaration({
      css,
      selector: ".foo",
      property: "color",
      value: "green",
    });
    expect(changed).toContain("green !important");
    expect(changed).not.toContain("color: red");
    expect(changed).not.toContain("color: blue");
    expect(readDeclarations({ css: changed, selector: ".foo" }).color).toBe(
      "green",
    );
  });
  it("adds and removes properties without losing comments", () => {
    const changed = updateDeclaration({
      css: "/* note */",
      selector: ".title",
      property: "padding",
      value: "12px 24px",
    });
    expect(readDeclarations({ css: changed, selector: ".title" }).padding).toBe(
      "12px 24px",
    );
    expect(
      updateDeclaration({
        css: changed,
        selector: ".title",
        property: "padding",
        value: "",
      }),
    ).toContain("/* note */");
  });
  it("rejects incomplete source and invalid selectors", () => {
    expect(validateCss(".title { color: red")).not.toBe("");
    expect(validateCss('.title { content: "}"; }')).toBe("");
    expect(validateSelector("[broken")).not.toBe("");
    expect(validateSelector(".title")).toBe("");
  });
});
describe("picker", () => {
  it("prefers unique ID, then class, then a structural selector", () => {
    document.body.innerHTML =
      '<main><h1 id="title" class="rm-title">Title</h1><p class="rm-block">One</p><p>Two</p><p>Three</p></main>';
    expect(getSelector(document.querySelector("h1")!)).toBe("#title");
    expect(getSelector(document.querySelector(".rm-block")!)).toBe(".rm-block");
    const target = document.querySelectorAll("p")[2];
    expect(document.querySelectorAll(getSelector(target))).toHaveLength(1);
    expect(document.querySelector(getSelector(target))).toBe(target);
  });
  it("escapes unusual IDs and uses classes when IDs are duplicated", () => {
    document.body.innerHTML =
      '<div id="1:a"></div><section><p id="dupe" class="same"></p><p id="dupe" class="same"></p></section>';
    expect(
      document.querySelector(getSelector(document.querySelector("div")!)),
    ).toBe(document.querySelector("div"));
    const target = document.querySelectorAll("p")[1];
    expect(getSelector(target)).toBe(".same");
    expect(document.querySelectorAll(getSelector(target))).toHaveLength(2);
  });
  it("suppresses selected clicks and cleans up after picking or Escape", () => {
    const button = document.createElement("button");
    document.body.append(button);
    let normalClicks = 0,
      picks = 0,
      ends = 0;
    button.addEventListener("click", () => normalClicks++);
    startPicker({ onPick: () => picks++, onEnd: () => ends++ });
    button.click();
    expect([picks, ends, normalClicks]).toEqual([1, 1, 0]);
    expect(document.querySelector(".cct-highlight")).toBeNull();
    button.click();
    expect(normalClicks).toBe(1);
    startPicker({ onPick: () => picks++, onEnd: () => ends++ });
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    button.click();
    expect([picks, ends, normalClicks]).toEqual([1, 2, 2]);
  });
});
