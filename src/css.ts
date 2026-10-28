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
  const matching: postcss.Rule[] = [];
  root.each((node) => {
    if (node.type === "rule" && node.selector === selector) matching.push(node);
  });
  let target = matching[matching.length - 1];
  if (!target) {
    target = postcss.rule({ selector });
    root.append(target);
    matching.push(target);
  }
  let important = false;
  matching.forEach((rule) => {
    rule.each((node) => {
      if (node.type !== "decl" || node.prop !== property) return;
      important ||= node.important;
      node.remove();
    });
  });
  if (value.trim())
    target.append(postcss.decl({ prop: property, value, important }));
  matching.forEach((rule) => {
    if (!rule.nodes.length) rule.remove();
  });
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
  const priorities: Record<string, boolean> = {};
  try {
    const root = postcss.parse(css, { from: undefined });
    root.each((node) => {
      if (node.type !== "rule" || node.selector !== selector) return;
      node.each((decl) => {
        if (decl.type !== "decl" || (priorities[decl.prop] && !decl.important))
          return;
        values[decl.prop] = decl.value;
        priorities[decl.prop] = decl.important;
      });
    });
  } catch {
    /* Keep source editable while incomplete. */
  }
  return values;
};
