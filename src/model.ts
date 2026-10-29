import {
  DEFAULT_LIBRARY_SIZE,
  MAX_LIBRARY_SIZE,
  MIN_LIBRARY_SIZE,
} from "./layout";
import {
  DEFAULT_POPOUT_BOUNDS,
  PopoutBounds,
  sanitizePopoutBounds,
} from "./popoutGeometry";

export type Stylesheet = {
  id: string;
  name: string;
  css: string;
  description?: string;
  enabled: boolean;
  shortcut?: { label: string; enabled: boolean };
};
export type Dock = "left" | "right" | "bottom" | "popout";
export type Library = {
  version: 1;
  examplesVersion: 1;
  sheets: Stylesheet[];
  dock: Dock;
  sideSize: number;
  bottomSize: number;
  librarySize: number;
  popoutBounds: PopoutBounds;
  suspended: boolean;
};
export const emptyLibrary = (): Library => ({
  version: 1,
  examplesVersion: 1,
  sheets: [],
  dock: "right",
  sideSize: 540,
  bottomSize: 440,
  librarySize: DEFAULT_LIBRARY_SIZE,
  popoutBounds: { ...DEFAULT_POPOUT_BOUNDS },
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
  if (raw === null) return { ...emptyLibrary(), sheets: createExampleSheets() };
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
        (sheet.description === undefined ||
          typeof sheet.description === "string") &&
        typeof sheet.enabled === "boolean" &&
        (sheet.shortcut === undefined ||
          (!!sheet.shortcut &&
            typeof sheet.shortcut.label === "string" &&
            sheet.shortcut.label.startsWith(
              "Custom CSS Toggle: Toggle stylesheet ",
            ) &&
            typeof sheet.shortcut.enabled === "boolean"))
      );
    }) ||
    new Set(v.sheets.map((s) => s.id)).size !== v.sheets.length ||
    new Set(v.sheets.flatMap((s) => (s.shortcut ? [s.shortcut.label] : [])))
      .size !== v.sheets.filter((s) => s.shortcut).length
  )
    throw new Error(
      "Saved CSS library is unreadable. Existing data has been left untouched.",
    );
  return {
    version: 1,
    examplesVersion: 1,
    sheets: migrateShortcutLabels(
      v.examplesVersion === 1
        ? v.sheets
        : [
            ...v.sheets,
            ...createExampleSheets().filter(
              (example) => !v.sheets!.some((sheet) => sheet.id === example.id),
            ),
          ],
    ),
    dock:
      v.dock === "left" || v.dock === "bottom" || v.dock === "popout"
        ? v.dock
        : "right",
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
    popoutBounds: sanitizePopoutBounds(v.popoutBounds),
  };
};
export const createSheet = ({
  name = "Untitled stylesheet",
  css = "",
  description = "",
}: { name?: string; css?: string; description?: string } = {}): Stylesheet => ({
  id: crypto.randomUUID(),
  name,
  css,
  description,
  enabled: false,
});
export const createShortcutLabel = ({
  sheet,
  sheets,
}: {
  sheet: Stylesheet;
  sheets: Stylesheet[];
}): string => {
  const base = `Custom CSS Toggle: Toggle stylesheet ${sheet.name.trim() || "Untitled stylesheet"}`;
  const labels = new Set(
    sheets.flatMap((s) => (s.shortcut ? [s.shortcut.label] : [])),
  );
  let label = base;
  let suffix = 2;
  while (labels.has(label)) label = `${base} (${suffix++})`;
  return label;
};
const migrateShortcutLabels = (sheets: Stylesheet[]): Stylesheet[] => {
  const legacyBase = (sheet: Stylesheet): string | undefined => {
    const label = sheet.shortcut?.label;
    const suffix = label?.match(/ \[([^\]]+)\](?: \(\d+\))?$/);
    return suffix?.[1] === sheet.id.slice(-8)
      ? label!.slice(0, suffix.index)
      : undefined;
  };
  const labels = new Set(
    sheets
      .filter((sheet) => !legacyBase(sheet))
      .flatMap((sheet) => (sheet.shortcut ? [sheet.shortcut.label] : [])),
  );
  return sheets.map((sheet) => {
    const base = legacyBase(sheet);
    if (!base || !sheet.shortcut) return sheet;
    let label = base;
    let suffix = 2;
    while (labels.has(label)) label = `${base} (${suffix++})`;
    labels.add(label);
    return { ...sheet, shortcut: { ...sheet.shortcut, label } };
  });
};

export const createExampleSheets = (): Stylesheet[] => [
  {
    id: "cct-example-hide-sidebar-logo",
    name: "Hide Roam Sidebar Logo",
    css: "#roam-sidebar-logo {\n  display: none !important;\n}\n",
    enabled: false,
  },
  {
    id: "cct-example-hide-topbar-icons",
    name: "Hide Topbar Icons",
    css: ".rm-topbar > .bp3-popover-wrapper,\n.rm-topbar > .bp3-button,\n.rm-topbar > .bp3-icon,\n.rm-topbar > .rm-topbar__spacer-sm,\n.rm-topbar .rm-find-or-create-wrapper .bp3-icon {\n  display: none !important;\n}\n",
    enabled: false,
  },
];

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
