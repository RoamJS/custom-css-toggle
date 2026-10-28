import postcss from "postcss";

export const validateCss = (css: string): string => {
  try {
    postcss.parse(css, { from: undefined });
    return "";
  } catch (error) {
    return error instanceof Error ? error.message : "Invalid CSS";
  }
};
export const validateSelector = (selector: string): string => {
  if (!selector.trim()) return "Select an element or enter a selector.";
  try {
    document.querySelectorAll(selector);
    return "";
  } catch {
    return "Enter a valid CSS selector.";
  }
};
export const updateDeclaration = ({
  css,
  selector,
  property,
  value,
}: {
  css: string;
  selector: string;
  property: string;
  value: string;
}): string => {
  const root = postcss.parse(css, { from: undefined });
  let target: postcss.Rule | undefined;
  root.each((node) => {
    if (node.type === "rule" && node.selector === selector) target = node;
  });
  if (!target) {
    target = postcss.rule({ selector });
    root.append(target);
  }
  let found = false;
  target.walkDecls(property, (decl) => {
    if (decl.parent !== target) return;
    if (value.trim()) {
      decl.value = value;
      decl.important = false;
      found = true;
    } else decl.remove();
  });
  if (value.trim() && !found)
    target.append(postcss.decl({ prop: property, value }));
  if (!target.nodes.length) target.remove();
  return root.toString();
};
export const readDeclarations = ({
  css,
  selector,
}: {
  css: string;
  selector: string;
}): Record<string, string> => {
  const values: Record<string, string> = {};
  try {
    const root = postcss.parse(css, { from: undefined });
    root.each((node) => {
      if (node.type !== "rule" || node.selector !== selector) return;
      node.each((decl) => {
        if (decl.type === "decl") values[decl.prop] = decl.value;
      });
    });
  } catch {
    /* Keep source editable while incomplete. */
  }
  return values;
};
