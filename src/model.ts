import {
  DEFAULT_LIBRARY_SIZE,
  MAX_LIBRARY_SIZE,
  MIN_LIBRARY_SIZE,
} from "./layout";

export type Stylesheet = {
  id: string;
  name: string;
  css: string;
  enabled: boolean;
};
export type Dock = "left" | "right" | "bottom";
export type Library = {
  version: 1;
  sheets: Stylesheet[];
  dock: Dock;
  sideSize: number;
  bottomSize: number;
  librarySize: number;
  suspended: boolean;
};
export const emptyLibrary = (): Library => ({
  version: 1,
  sheets: [],
  dock: "right",
  sideSize: 540,
  bottomSize: 440,
  librarySize: DEFAULT_LIBRARY_SIZE,
  suspended: false,
});
export const storageKey = ({
  graph,
  user,
}: {
  graph: string;
  user: string;
}): string => {
  if (!graph || !user)
    throw new Error("Sign in to a graph to use personal CSS.");
  return `roamjs:custom-css-toggle:${encodeURIComponent(graph)}:${encodeURIComponent(user)}`;
};
export const readLibrary = (raw: string | null): Library => {
  if (raw === null) return emptyLibrary();
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== "object")
    throw new Error("Saved CSS library is unreadable.");
  const v = value as Partial<Library>;
  if (
    v.version !== 1 ||
    !Array.isArray(v.sheets) ||
    !v.sheets.every((s: unknown) => {
      if (!s || typeof s !== "object") return false;
      const sheet = s as Partial<Stylesheet>;
      return (
        typeof sheet.id === "string" &&
        !!sheet.id &&
        typeof sheet.name === "string" &&
        typeof sheet.css === "string" &&
        typeof sheet.enabled === "boolean"
      );
    }) ||
    new Set(v.sheets.map((s) => s.id)).size !== v.sheets.length
  )
    throw new Error(
      "Saved CSS library is unreadable. Existing data has been left untouched.",
    );
  return {
    version: 1,
    sheets: v.sheets,
    dock: v.dock === "left" || v.dock === "bottom" ? v.dock : "right",
    sideSize:
      typeof v.sideSize === "number" && Number.isFinite(v.sideSize)
        ? Math.max(320, Math.min(1400, v.sideSize))
        : 540,
    bottomSize:
      typeof v.bottomSize === "number" && Number.isFinite(v.bottomSize)
        ? Math.max(240, Math.min(1200, v.bottomSize))
        : 440,
    librarySize:
      typeof v.librarySize === "number" && Number.isFinite(v.librarySize)
        ? Math.max(MIN_LIBRARY_SIZE, Math.min(MAX_LIBRARY_SIZE, v.librarySize))
        : DEFAULT_LIBRARY_SIZE,
    suspended: v.suspended === true,
  };
};
export const createSheet = ({
  name = "Untitled stylesheet",
  css = "",
}: { name?: string; css?: string } = {}): Stylesheet => ({
  id: crypto.randomUUID(),
  name,
  css,
  enabled: false,
});
export type Preview = { id: string; css: string };
export const applyStyles = ({
  host,
  library,
  preview,
}: {
  host: HTMLElement;
  library: Library;
  preview?: Preview;
}): void => {
  host.replaceChildren();
  if (library.suspended) return;
  library.sheets.forEach((sheet) => {
    if (!sheet.enabled && sheet.id !== preview?.id) return;
    const style = document.createElement("style");
    style.dataset.stylesheetId = sheet.id;
    style.textContent = sheet.id === preview?.id ? preview.css : sheet.css;
    host.appendChild(style);
  });
};
