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
