// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  applyStyles,
  createExampleSheets,
  emptyLibrary,
  readLibrary,
} from "../src/model";
import { validateCss } from "../src/css";

describe("shipped examples", () => {
  it("starts new libraries with two disabled valid examples", () => {
    const library = readLibrary(null);
    expect(library.sheets).toEqual(createExampleSheets());
    expect(library.sheets.every((s) => !s.enabled && !validateCss(s.css))).toBe(
      true,
    );
    const host = document.createElement("div");
    applyStyles({ host, library });
    expect(host.children).toHaveLength(0);
  });
  it("adds examples once while preserving existing CSS and choices", () => {
    const { examplesVersion, ...old } = emptyLibrary();
    const existing = {
      id: "mine",
      name: "My CSS",
      css: "body { color: red }",
      enabled: true,
    };
    const migrated = readLibrary(
      JSON.stringify({ ...old, sheets: [existing], suspended: true }),
    );
    expect(migrated.sheets[0]).toEqual(existing);
    expect(migrated.suspended).toBe(true);
    expect(migrated.sheets).toHaveLength(3);
    expect(readLibrary(JSON.stringify(migrated))).toEqual(migrated);
    expect(
      readLibrary(JSON.stringify({ ...migrated, sheets: [existing] })).sheets,
    ).toEqual([existing]);
  });
  it("preserves an edited existing example during migration", () => {
    const { examplesVersion, ...old } = emptyLibrary();
    const example = {
      ...createExampleSheets()[0],
      css: "edited CSS",
      enabled: true,
    };
    const library = readLibrary(JSON.stringify({ ...old, sheets: [example] }));
    expect(library.sheets[0]).toEqual(example);
    expect(library.sheets).toHaveLength(2);
  });
  it("removes old ID suffixes and disambiguates duplicates numerically", () => {
    const prefix = "Custom CSS Toggle: Toggle stylesheet Reading";
    const sheets = [
      {
        id: "old12345678",
        name: "Renamed",
        css: "",
        enabled: true,
        shortcut: { label: `${prefix} [12345678]`, enabled: true },
      },
      {
        id: "clean",
        name: "Reading",
        css: "",
        enabled: false,
        shortcut: { label: prefix, enabled: true },
      },
      {
        id: "old87654321",
        name: "Reading",
        css: "",
        enabled: false,
        shortcut: { label: `${prefix} [87654321]`, enabled: false },
      },
    ];
    const library = readLibrary(JSON.stringify({ ...emptyLibrary(), sheets }));
    expect(library.sheets.map((s) => s.shortcut?.label)).toEqual([
      `${prefix} (2)`,
      prefix,
      `${prefix} (3)`,
    ]);
    expect(library.sheets.map((s) => s.shortcut?.enabled)).toEqual([
      true,
      true,
      false,
    ]);
    expect(readLibrary(JSON.stringify(library))).toEqual(library);
  });
});
