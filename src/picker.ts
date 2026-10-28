const escape = (value: string): string => CSS.escape(value);
export const getSelector = (element: Element): string => {
  const doc = element.ownerDocument;
  const unique = (selector: string): boolean =>
    doc.querySelectorAll(selector).length === 1;
  if (element.id && unique(`#${escape(element.id)}`))
    return `#${escape(element.id)}`;
  const classes = Array.from(element.classList).filter(
    (c) => !/^(hover:|focus:|active$|bp3-active$)/.test(c),
  );
  // Native Roam classes are more stable than utility or state classes.
  classes.sort(
    (a, b) => Number(b.startsWith("rm-")) - Number(a.startsWith("rm-")),
  );
  for (const name of classes) {
    const selector = `.${escape(name)}`;
    if (unique(selector)) return selector;
  }
  if (classes.length) {
    const combined = classes.map((c) => `.${escape(c)}`).join("");
    if (unique(combined)) return combined;
  }
  const path: string[] = [];
  let current: Element | null = element;
  while (current) {
    if (current.id && unique(`#${escape(current.id)}`)) {
      path.unshift(`#${escape(current.id)}`);
      break;
    }
    let part = current.tagName.toLowerCase();
    const parent: Element | null = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        (s) => s.tagName === current?.tagName,
      );
      if (siblings.length > 1)
        part += `:nth-of-type(${siblings.indexOf(current) + 1})`;
    }
    path.unshift(part);
    if (unique(path.join(" > "))) break;
    current = parent;
  }
  return path.join(" > ");
};
export type PickedElement = {
  selector: string;
  matches: number;
  computed: Record<string, string>;
};
export const startPicker = ({
  onPick,
  onEnd,
}: {
  onPick: (picked: PickedElement) => void;
  onEnd: () => void;
}): (() => void) => {
  const overlay = document.createElement("div");
  overlay.dataset.cctOwned = "true";
  overlay.className = "cct-highlight";
  overlay.hidden = true;
  document.body.appendChild(overlay);
  let target: Element | null = null;
  let ended = false;
  const stop = (): void => {
    if (ended) return;
    ended = true;
    document.removeEventListener("pointermove", move, true);
    document.removeEventListener("click", click, true);
    document.removeEventListener("keydown", key, true);
    window.removeEventListener("blur", stop);
    overlay.remove();
    onEnd();
  };
  const move = (event: PointerEvent): void => {
    const el = event.target instanceof Element ? event.target : null;
    target = el && !el.closest("[data-cct-owned], .cct-portal") ? el : null;
    if (!target) {
      overlay.hidden = true;
      return;
    }
    const rect = target.getBoundingClientRect();
    overlay.hidden = false;
    Object.assign(overlay.style, {
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
    });
  };
  const click = (event: MouseEvent): void => {
    if (
      event.target instanceof Element &&
      event.target.closest("[data-cct-owned], .cct-portal")
    )
      return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const el = event.target instanceof Element ? event.target : target;
    if (!el) return;
    const selector = getSelector(el);
    const style = getComputedStyle(el);
    const computed: Record<string, string> = {};
    for (const prop of [
      "color",
      "background-color",
      "font-size",
      "font-family",
      "font-weight",
      "line-height",
      "padding",
      "margin",
      "border-radius",
      "width",
    ])
      computed[prop] = style.getPropertyValue(prop);
    stop();
    onPick({
      selector,
      matches: document.querySelectorAll(selector).length,
      computed,
    });
  };
  const key = (event: KeyboardEvent): void => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    event.stopImmediatePropagation();
    stop();
  };
  document.addEventListener("pointermove", move, true);
  document.addEventListener("click", click, true);
  document.addEventListener("keydown", key, true);
  window.addEventListener("blur", stop);
  return stop;
};
