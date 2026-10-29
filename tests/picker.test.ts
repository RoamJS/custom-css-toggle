// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import cssesc from "cssesc";
import { getSelector, PickedElement, startPicker } from "../src/picker";

beforeEach(() => {
  document.body.replaceChildren();
  Object.defineProperty(globalThis, "CSS", {
    configurable: true,
    value: { escape: (value: string) => cssesc(value, { isIdentifier: true }) },
  });
});

describe("reusable picker selectors", () => {
  it("uses native title and container classes across multiple daily notes", () => {
    document.body.innerHTML = `
      <main>
        <div class="flex rm-title-display-container">
          <h1 class="text-xl rm-title-display">October 28th</h1>
        </div>
        <div class="flex rm-title-display-container">
          <h1 class="text-xl rm-title-display">October 27th</h1>
        </div>
      </main>`;

    for (const title of document.querySelectorAll("h1")) {
      expect(getSelector(title)).toBe(".rm-title-display");
      expect(getSelector(title.parentElement!)).toBe(
        ".rm-title-display-container",
      );
    }
  });

  it("still prefers a unique ID over repeated native classes", () => {
    document.body.innerHTML =
      '<h1 id="page:title" class="rm-title-display"></h1><h1 class="rm-title-display"></h1>';
    const title = document.querySelector("h1")!;
    expect(getSelector(title)).toBe("#page\\:title");
    expect(document.querySelector(getSelector(title))).toBe(title);
  });

  it("picks the semantic title when regular page titles wrap their text in plain spans", () => {
    document.body.innerHTML = `
      <h1 class="rm-title-display" style="font-size:32px;padding:12px">
        <span><span>October 28th</span></span>
      </h1>
      <h1 class="rm-title-display">October 27th</h1>`;
    const title = document.querySelector("h1")!;
    const text = title.querySelector("span span")!;
    expect(getSelector(text)).toBe(".rm-title-display");
    title.getBoundingClientRect = () => ({
      x: 10,
      y: 20,
      left: 10,
      top: 20,
      right: 210,
      bottom: 60,
      width: 200,
      height: 40,
      toJSON: () => ({}),
    });
    let picked: PickedElement | undefined;
    startPicker({
      onPick: (value) => {
        picked = value;
      },
      onEnd: () => undefined,
    });

    text.dispatchEvent(new MouseEvent("pointermove", { bubbles: true }));
    const highlight = document.querySelector<HTMLElement>(".cct-highlight")!;
    expect(highlight.style.left).toBe("10px");
    expect(highlight.style.width).toBe("200px");
    text.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(picked).toMatchObject({
      selector: ".rm-title-display",
      matches: 2,
      computed: { "font-size": "32px", padding: "12px" },
    });
    expect(document.querySelector(".cct-highlight")).toBeNull();
  });

  it("preserves directly targeted title descendants with their own identity or styling", () => {
    document.body.innerHTML = `
      <h1 class="rm-title-display">
        <span id="title-fragment">ID</span>
        <span class="rm-page-ref">Class</span>
        <span style="color:red">Styled</span>
        <em>Emphasized</em>
      </h1>
      <div><span>Outside the title</span></div>`;
    expect(getSelector(document.querySelector("#title-fragment")!)).toBe(
      "#title-fragment",
    );
    expect(getSelector(document.querySelector(".rm-page-ref")!)).toBe(
      ".rm-page-ref",
    );
    for (const element of document.querySelectorAll("[style], em, div span")) {
      expect(document.querySelector(getSelector(element))).toBe(element);
    }
  });

  it("ignores transient classes and escapes a reusable class", () => {
    document.body.innerHTML = `
      <p class="active bp3-active md:hover:text-red focus-visible:ring-2 1:label"></p>
      <p class="1:label"></p>`;
    const selector = getSelector(document.querySelector("p")!);
    expect(selector).toBe(`.${CSS.escape("1:label")}`);
    expect(document.querySelectorAll(selector)).toHaveLength(2);
  });

  it("uses a unique structural path when only transient classes or duplicate IDs remain", () => {
    document.body.innerHTML =
      '<section><p id="duplicate" class="active"></p><p id="duplicate" class="focus:ring-2"></p></section>';
    const target = document.querySelectorAll("p")[1];
    expect(document.querySelectorAll(getSelector(target))).toHaveLength(1);
    expect(document.querySelector(getSelector(target))).toBe(target);
  });

  it("reports every class match while reading the clicked title's computed style", () => {
    document.body.innerHTML =
      '<h1 class="rm-title-display" style="font-size:24px">First</h1><h1 class="rm-title-display" style="font-size:32px">Second</h1>';
    let picked: PickedElement | undefined;
    let ended = 0;
    const stop = startPicker({
      onPick: (value) => {
        picked = value;
      },
      onEnd: () => ended++,
    });

    document.querySelectorAll("h1")[1].click();
    expect(picked).toMatchObject({
      selector: ".rm-title-display",
      matches: 2,
      computed: { "font-size": "32px" },
    });
    expect(document.querySelector(".cct-highlight")).toBeNull();
    stop();
    expect(ended).toBe(1);
  });

  it.each(["pick", "Escape", "cancel"] as const)(
    "prevents native editing presses and restores them after %s",
    (finish) => {
      document.body.innerHTML = `
        <div class="cct-portal"><button>Cancel selection</button></div>
        <h1 class="rm-title-display"><span>October 28th</span></h1>`;
      const title = document.querySelector("h1")!;
      const text = title.querySelector("span")!;
      const editorButton = document.querySelector("button")!;
      let nativeEditing = 0,
        editorPresses = 0,
        picked = 0,
        ended = 0;
      for (const type of ["pointerdown", "mousedown"]) {
        title.addEventListener(type, () => nativeEditing++);
        editorButton.addEventListener(type, () => editorPresses++);
      }
      const stop = startPicker({
        onPick: () => picked++,
        onEnd: () => ended++,
      });

      for (const type of ["pointerdown", "mousedown"]) {
        const pagePress = new MouseEvent(type, {
          bubbles: true,
          cancelable: true,
        });
        text.dispatchEvent(pagePress);
        expect(pagePress.defaultPrevented).toBe(true);
        const editorPress = new MouseEvent(type, {
          bubbles: true,
          cancelable: true,
        });
        editorButton.dispatchEvent(editorPress);
        expect(editorPress.defaultPrevented).toBe(false);
      }
      expect([nativeEditing, editorPresses]).toEqual([0, 2]);

      if (finish === "pick") text.click();
      else if (finish === "Escape")
        document.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );
      else stop();

      for (const type of ["pointerdown", "mousedown"])
        text.dispatchEvent(new MouseEvent(type, { bubbles: true }));
      stop();
      expect(nativeEditing).toBe(2);
      expect(ended).toBe(1);
      expect(picked).toBe(finish === "pick" ? 1 : 0);
      expect(document.querySelector(".cct-highlight")).toBeNull();
    },
  );

  it("leaves editor clicks alone and cancels once on blur", () => {
    document.body.innerHTML =
      '<div class="cct-portal"><button>Edit</button></div><h1 class="rm-title-display">Title</h1>';
    let picked = 0,
      ended = 0,
      editorClicks = 0;
    const editorButton = document.querySelector("button")!;
    editorButton.addEventListener("click", () => editorClicks++);
    const stop = startPicker({
      onPick: () => picked++,
      onEnd: () => ended++,
    });
    editorButton.click();
    expect([picked, ended, editorClicks]).toEqual([0, 0, 1]);
    window.dispatchEvent(new Event("blur"));
    document.querySelector("h1")!.click();
    stop();
    expect([picked, ended]).toEqual([0, 1]);
    expect(document.querySelector(".cct-highlight")).toBeNull();
  });
});
