import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  Alert,
  Button,
  ButtonGroup,
  IconName,
  Icon,
  H4,
  Callout,
  Drawer,
  FormGroup,
  HTMLSelect,
  InputGroup,
  Intent,
  Position,
  Switch,
  Tab,
  Tabs,
  TextArea,
} from "@blueprintjs/core";
import CodeEditor from "./CodeEditor";
import LibraryPanel from "./LibraryPanel";
import Popout from "./Popout";
import SheetShortcut from "./SheetShortcut";
import {
  createSheet,
  createShortcutLabel,
  Dock,
  Library,
  Preview,
  Stylesheet,
} from "./model";
import {
  readDeclarations,
  updateDeclaration,
  validateCss,
  validateSelector,
} from "./css";
import { PickedElement, startPicker } from "./picker";

export type EditorHandlers = {
  open: () => void;
  emergency: () => void;
  unpause: () => void;
  toggleAll: () => void;
  toggleSheet: (id: string) => void;
};
type Props = {
  initial: Library;
  save: (library: Library) => void;
  apply: (library: Library, preview?: Preview) => void;
  register: (handlers: EditorHandlers) => void;
};
const DOCK_OPTIONS: { dock: Dock; label: string; icon: IconName }[] = [
  { dock: "left", label: "Dock left", icon: "drawer-left" },
  { dock: "bottom", label: "Dock bottom", icon: "widget-footer" },
  { dock: "right", label: "Dock right", icon: "drawer-right" },
  { dock: "popout", label: "Popout", icon: "application" },
];
const PROPERTIES = [
  ["display", "Display"],
  ["color", "Text color"],
  ["background-color", "Background"],
  ["font-size", "Font size"],
  ["font-family", "Font family"],
  ["font-weight", "Font weight"],
  ["line-height", "Line height"],
  ["padding", "Padding"],
  ["margin", "Margin"],
  ["border-radius", "Corner radius"],
  ["width", "Width"],
];
const DISPLAY_OPTIONS = [
  { label: "Use page style", value: "" },
  { label: "None (hide element)", value: "none" },
  { label: "Block", value: "block" },
  { label: "Inline", value: "inline" },
  { label: "Inline block", value: "inline-block" },
  { label: "Flex", value: "flex" },
  { label: "Inline flex", value: "inline-flex" },
  { label: "Grid", value: "grid" },
  { label: "Inline grid", value: "inline-grid" },
  { label: "Flow root", value: "flow-root" },
  { label: "Contents", value: "contents" },
  { label: "List item", value: "list-item" },
  { label: "Table", value: "table" },
  { label: "Table row", value: "table-row" },
  { label: "Table cell", value: "table-cell" },
  { label: "Inherit", value: "inherit" },
];
const PropertyField = ({
  property,
  label,
  value,
  placeholder,
  onChange,
}: {
  property: string;
  label: string;
  value: string;
  placeholder?: string;
  onChange: (property: string, value: string) => void;
}): React.ReactElement => {
  const [draft, setDraft] = useState(value);
  const [invalid, setInvalid] = useState(false);
  useEffect(() => {
    setDraft(value);
    setInvalid(false);
  }, [value]);
  const change = (next: string): void => {
    setDraft(next);
    const valid = !next.trim() || CSS.supports(property, next);
    setInvalid(!valid);
    if (valid) onChange(property, next);
  };
  const isColor = property === "color" || property === "background-color";
  return (
    <FormGroup
      label={label}
      labelFor={`cct-${property}`}
      helperText={invalid ? "Enter a valid CSS value." : undefined}
      intent={invalid ? Intent.DANGER : Intent.NONE}
    >
      <div className="cct-property-input">
        {isColor && (
          <input
            type="color"
            aria-label={`${label} picker`}
            value={/^#[\da-f]{6}$/i.test(draft) ? draft : "#182026"}
            onChange={(e) => change(e.target.value)}
          />
        )}
        {property === "display" ? (
          <HTMLSelect
            id="cct-display"
            value={draft}
            fill
            options={
              DISPLAY_OPTIONS.some((option) => option.value === draft)
                ? DISPLAY_OPTIONS
                : [...DISPLAY_OPTIONS, { label: draft, value: draft }]
            }
            onChange={(e) => change(e.target.value)}
          />
        ) : (
          <InputGroup
            id={`cct-${property}`}
            value={draft}
            placeholder={placeholder || "Unchanged"}
            intent={invalid ? Intent.DANGER : Intent.NONE}
            onChange={(e) => change(e.target.value)}
          />
        )}
      </div>
    </FormGroup>
  );
};
const App = ({ initial, save, apply, register }: Props): React.ReactElement => {
  const [library, setLibrary] = useState(initial);
  const currentLibrary = useRef(initial);
  const currentDraftIsDirty = useRef(false);
  const operationEpoch = useRef(0);
  const renderEpoch = operationEpoch.current;
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(initial.sheets[0]?.id || "");
  const [draftCss, setDraftCss] = useState(initial.sheets[0]?.css || "");
  const [draftName, setDraftName] = useState(initial.sheets[0]?.name || "");
  const [draftDescription, setDraftDescription] = useState(
    initial.sheets[0]?.description || "",
  );
  const [preview, setPreview] = useState(true);
  const [tab, setTab] = useState<string | number>("visual");
  const [selector, setSelector] = useState("");
  const [computed, setComputed] = useState<Record<string, string>>({});
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<(() => void) | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const pickerCleanup = useRef<(() => void) | null>(null);
  const resizeCleanup = useRef<(() => void) | null>(null);
  const selected = library.sheets.find((s) => s.id === selectedId);
  const syntaxError = validateCss(draftCss);
  const selectorError = validateSelector(selector);
  const declarations = readDeclarations({ css: draftCss, selector });
  const dirty =
    !!selected &&
    (draftCss !== selected.css ||
      draftName !== selected.name ||
      draftDescription !== (selected.description || ""));
  currentDraftIsDirty.current = dirty;
  const livePreview = !!selected && preview;
  const live =
    open && livePreview && !library.suspended && selected && !syntaxError
      ? { id: selected.id, css: draftCss }
      : undefined;
  useEffect(() => {
    apply(library, live);
  }, [library, open, preview, selectedId, draftCss, syntaxError]);
  useEffect(
    () => () => {
      operationEpoch.current += 1;
      pickerCleanup.current?.();
      resizeCleanup.current?.();
    },
    [],
  );
  const updateLibrary = (next: Library): void => {
    currentLibrary.current = next;
    setLibrary(next);
  };
  const persistCurrent = (update: (current: Library) => Library): boolean => {
    try {
      const next = update(currentLibrary.current);
      save(next);
      updateLibrary(next);
      setError("");
      return true;
    } catch {
      setError(
        "Could not save to browser storage. Your changes are still open; export a copy before closing.",
      );
      return false;
    }
  };
  const persist = (update: (current: Library) => Library): boolean => {
    // Deferred imports and confirmations must not undo an emergency pause.
    if (renderEpoch !== operationEpoch.current) return false;
    return persistCurrent(update);
  };
  const resetDraft = (sheet?: Stylesheet): void => {
    setSelectedId(sheet?.id || "");
    setDraftCss(sheet?.css || "");
    setDraftName(sheet?.name || "");
    setDraftDescription(sheet?.description || "");
    setSelector("");
    setComputed({});
    setPreview(true);
  };
  const guard = (action: () => void): void => {
    if (dirty) setPending(() => action);
    else action();
  };
  const close = (): void =>
    guard(() => {
      pickerCleanup.current?.();
      resizeCleanup.current?.();
      setOpen(false);
      resetDraft(selected);
    });
  const pauseAll = ({
    showEditor = true,
  }: { showEditor?: boolean } = {}): void => {
    operationEpoch.current += 1;
    setPending(null);
    resizeCleanup.current?.();
    pickerCleanup.current?.();
    setPreview(false);
    const next = { ...currentLibrary.current, suspended: true };
    // Removing styles must work even when browser storage is full or unavailable.
    updateLibrary(next);
    apply(next);
    try {
      save(next);
      setError("");
    } catch {
      setError(
        "CSS paused for this session. Browser storage could not save the pause.",
      );
    }
    if (showEditor) setOpen(true);
  };
  const emergency = (): void => pauseAll();
  const unpause = (): void => {
    if (currentLibrary.current.suspended)
      persistCurrent((current) => ({ ...current, suspended: false }));
  };
  const toggleAll = (): void => {
    if (currentLibrary.current.suspended) unpause();
    else pauseAll({ showEditor: false });
  };
  const toggleSheet = (id: string): void => {
    const sheet = currentLibrary.current.sheets.find((s) => s.id === id);
    if (!sheet) return;
    const changed = persistCurrent((current) => ({
      ...current,
      sheets: current.sheets.map((s) =>
        s.id === id ? { ...s, enabled: !s.enabled } : s,
      ),
    }));
    if (changed && id === selectedId && sheet.enabled) setPreview(false);
  };
  useLayoutEffect(() => {
    register({
      open: () => setOpen(true),
      emergency,
      unpause,
      toggleAll,
      toggleSheet,
    });
  });
  const addSheet = (sheet: Stylesheet, preserveDraft = false): void => {
    if (
      persist((current) => ({
        ...current,
        sheets: [...current.sheets, sheet],
      })) &&
      (!preserveDraft || !currentDraftIsDirty.current)
    )
      resetDraft(sheet);
  };
  const saveDraft = (): void => {
    if (!selected || syntaxError || !draftName.trim()) return;
    if (
      persist((current) => ({
        ...current,
        sheets: current.sheets.map((s) =>
          s.id === selectedId
            ? {
                ...s,
                css: draftCss,
                name: draftName.trim(),
                description: draftDescription,
              }
            : s,
        ),
      }))
    )
      setDraftName(draftName.trim());
  };
  const pick = (): void => {
    if (picking) {
      pickerCleanup.current?.();
      return;
    }
    setPicking(true);
    pickerCleanup.current = startPicker({
      onPick: (picked: PickedElement) => {
        setSelector(picked.selector);
        setComputed(picked.computed);
        setTab("visual");
      },
      onEnd: () => {
        setPicking(false);
        pickerCleanup.current = null;
      },
    });
  };
  const changeProperty = (property: string, value: string): void => {
    if (selectorError || syntaxError) return;
    try {
      setDraftCss(
        updateDeclaration({
          css: draftCss,
          selector: selector.trim(),
          property,
          value,
          forceImportant: true,
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update CSS.");
    }
  };
  const exportSheet = (): void => {
    const url = URL.createObjectURL(new Blob([draftCss], { type: "text/css" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${(draftName || "stylesheet").replace(/[^\w -]/g, "_")}.css`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const resize = (event: React.PointerEvent<HTMLDivElement>): void => {
    event.preventDefault();
    resizeCleanup.current?.();
    const start = {
      x: event.clientX,
      y: event.clientY,
      side: library.sideSize,
      bottom: library.bottomSize,
    };
    let next = library;
    const move = (e: PointerEvent): void => {
      const sideSize = Math.max(
        320,
        Math.min(
          window.innerWidth - 24,
          start.side +
            (library.dock === "left"
              ? e.clientX - start.x
              : start.x - e.clientX),
        ),
      );
      const bottomSize = Math.max(
        240,
        Math.min(window.innerHeight - 24, start.bottom + start.y - e.clientY),
      );
      next = { ...currentLibrary.current, sideSize, bottomSize };
      updateLibrary(next);
    };
    const stop = (): void => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
      resizeCleanup.current = null;
      persist((current) => ({
        ...current,
        sideSize: next.sideSize,
        bottomSize: next.bottomSize,
      }));
    };
    resizeCleanup.current = stop;
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
  };
  const resizeKey = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    const bottom = library.dock === "bottom";
    if (
      !(
        bottom ? ["ArrowUp", "ArrowDown"] : ["ArrowLeft", "ArrowRight"]
      ).includes(e.key)
    )
      return;
    e.preventDefault();
    if (bottom)
      persist((current) => ({
        ...current,
        bottomSize: Math.max(
          240,
          Math.min(
            window.innerHeight - 24,
            current.bottomSize + (e.key === "ArrowUp" ? 24 : -24),
          ),
        ),
      }));
    else
      persist((current) => ({
        ...current,
        sideSize: Math.max(
          320,
          Math.min(
            window.innerWidth - 24,
            current.sideSize +
              ((e.key === "ArrowRight") === (current.dock === "left")
                ? 24
                : -24),
          ),
        ),
      }));
  };
  const position =
    library.dock === "left"
      ? Position.LEFT
      : library.dock === "bottom"
        ? Position.BOTTOM
        : Position.RIGHT;
  const headerActions = (
    <div className="cct-toolbar">
      <ButtonGroup role="group" aria-label="Editor position">
        {DOCK_OPTIONS.map(({ dock, label, icon }) => (
          <Button
            key={dock}
            small
            outlined
            icon={icon}
            title={label}
            aria-label={label}
            aria-pressed={library.dock === dock}
            active={library.dock === dock}
            onClick={() => {
              pickerCleanup.current?.();
              resizeCleanup.current?.();
              persist((current) => ({ ...current, dock }));
            }}
          />
        ))}
      </ButtonGroup>
      <Button
        small
        outlined
        icon={library.suspended ? "play" : "pause"}
        onClick={() => (library.suspended ? unpause() : emergency())}
      >
        {library.suspended ? "Resume CSS" : "Pause all"}
      </Button>
    </div>
  );
  const editor = (
    <div
      data-cct-owned="true"
      className="cct-shell"
      role={library.dock === "popout" ? undefined : "dialog"}
      aria-label={library.dock === "popout" ? undefined : "Custom CSS Toggle"}
    >
      {library.dock !== "popout" && (
        <div
          role="separator"
          aria-label="Resize CSS editor"
          aria-orientation={
            library.dock === "bottom" ? "horizontal" : "vertical"
          }
          aria-valuenow={
            library.dock === "bottom" ? library.bottomSize : library.sideSize
          }
          tabIndex={0}
          className="cct-resize"
          onPointerDown={resize}
          onKeyDown={resizeKey}
        />
      )}
      {library.dock !== "popout" && (
        <header className="cct-editor-header">
          <div className="cct-editor-title">
            <Icon icon="style" size={16} />
            <H4 title="Custom CSS Toggle">Custom CSS Toggle</H4>
          </div>
          {headerActions}
          <Button minimal icon="cross" aria-label="Close" onClick={close} />
        </header>
      )}
      {error && <Callout intent="danger">{error}</Callout>}
      {library.suspended && (
        <Callout intent="warning">
          All personal CSS is paused. Resume when ready.
        </Callout>
      )}
      <div className="cct-layout">
        <LibraryPanel
          size={library.librarySize}
          cancelEpoch={renderEpoch}
          onResize={(librarySize) =>
            persist((current) => ({ ...current, librarySize }))
          }
        >
          <div className="cct-library-heading">
            <strong>Stylesheets</strong>
            <Button
              small
              minimal
              icon="add"
              aria-label="New stylesheet"
              onClick={() => guard(() => addSheet(createSheet()))}
            />
          </div>
          <div className="cct-sheet-list">
            {library.sheets.length === 0 && (
              <p className="cct-empty">
                Create a stylesheet or import a .css file to get started.
              </p>
            )}
            {library.sheets.map((sheet) => (
              <div
                key={sheet.id}
                className={`cct-sheet ${selectedId === sheet.id ? "cct-selected" : ""}`}
              >
                <Switch
                  checked={sheet.enabled}
                  aria-label={`Enable ${sheet.name}`}
                  onChange={() => toggleSheet(sheet.id)}
                />
                <Button
                  minimal
                  active={selectedId === sheet.id}
                  text={sheet.name}
                  title={sheet.name}
                  onClick={() =>
                    guard(() => {
                      pickerCleanup.current?.();
                      resetDraft(sheet);
                    })
                  }
                />
              </div>
            ))}
          </div>
          <Button
            outlined
            small
            icon="import"
            onClick={() => guard(() => file.current?.click())}
          >
            Import .css
          </Button>
          <input
            ref={file}
            type="file"
            accept=".css,text/css"
            hidden
            onChange={async (e) => {
              const input = e.currentTarget;
              const imported = input.files?.[0];
              input.value = "";
              if (!imported) return;
              if (imported.size > 1_000_000) {
                setError("Choose a CSS file smaller than 1 MB.");
                return;
              }
              try {
                const css = await imported.text();
                const problem = validateCss(css);
                if (problem) {
                  setError(problem);
                  return;
                }
                addSheet(
                  createSheet({
                    name: imported.name.replace(/\.css$/i, ""),
                    css,
                  }),
                  true,
                );
              } catch {
                setError("Could not read the selected file.");
              }
            }}
          />
          <p className="cct-help">
            Enabled files stack in list order. Styles stay out of the shared
            roam/css page.
          </p>
        </LibraryPanel>
        <main className="cct-workspace">
          {!selected ? (
            <div className="cct-welcome">
              <h3>Your Roam, your styles</h3>
              <p>
                Change what you see without changing your collaborators’ view.
              </p>
              <Button
                intent="primary"
                icon="add"
                onClick={() => addSheet(createSheet())}
              >
                Create stylesheet
              </Button>
            </div>
          ) : (
            <>
              <div className="cct-file-heading">
                <InputGroup
                  aria-label="Stylesheet name"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                />
                <Button
                  minimal
                  icon="download"
                  aria-label="Export CSS file"
                  onClick={exportSheet}
                />
                <Button
                  minimal
                  icon="trash"
                  aria-label="Delete stylesheet"
                  onClick={() =>
                    setPending(() => () => {
                      let sheets: Stylesheet[] = [];
                      if (
                        persist((current) => {
                          sheets = current.sheets.filter(
                            (s) => s.id !== selected.id,
                          );
                          return { ...current, sheets };
                        })
                      )
                        resetDraft(sheets[0]);
                    })
                  }
                />
              </div>
              <details
                className="cct-description"
                key={`description:${selected.id}`}
              >
                <summary>Description</summary>
                <TextArea
                  aria-label="Stylesheet description"
                  placeholder="What does this stylesheet change?"
                  value={draftDescription}
                  onChange={(event) => setDraftDescription(event.target.value)}
                  rows={3}
                  fill
                />
              </details>
              <SheetShortcut
                key={selected.id}
                sheet={selected}
                onChange={(enabled) =>
                  persist((current) => ({
                    ...current,
                    sheets: current.sheets.map((sheet) =>
                      sheet.id === selected.id
                        ? {
                            ...sheet,
                            shortcut: {
                              label:
                                sheet.shortcut?.label ||
                                createShortcutLabel({
                                  sheet,
                                  sheets: current.sheets,
                                }),
                              enabled,
                            },
                          }
                        : sheet,
                    ),
                  }))
                }
              />
              <div className="cct-preview-row">
                <Switch
                  label="Live preview"
                  checked={livePreview && !library.suspended}
                  disabled={library.suspended}
                  onChange={() => setPreview(!preview)}
                />
                <span role="status">
                  {library.suspended
                    ? "All styles paused"
                    : syntaxError
                      ? selected.enabled
                        ? "Invalid CSS; showing saved styles"
                        : "Preview unavailable until CSS is valid"
                      : preview
                        ? "Previewing unsaved changes"
                        : selected.enabled
                          ? "Showing saved styles"
                          : "Preview off"}
                  {dirty ? " · Unsaved" : ""}
                </span>
              </div>
              <Tabs
                id="cct-editor-tabs"
                selectedTabId={tab}
                onChange={setTab}
                renderActiveTabPanelOnly
              >
                <Tab
                  id="visual"
                  title="Visual editor"
                  panel={
                    <div className="cct-visual">
                      <Button
                        icon="select"
                        active={picking}
                        outlined
                        onClick={pick}
                      >
                        {picking ? "Cancel selection (Esc)" : "Select element"}
                      </Button>
                      <FormGroup
                        label="CSS selector"
                        labelFor="cct-selector"
                        helperText={
                          selector
                            ? selectorError ||
                              `${document.querySelectorAll(selector).length} matching element(s) · edits affect every match`
                            : "Pick an element or enter a selector to style."
                        }
                        intent={
                          selector && selectorError
                            ? Intent.DANGER
                            : Intent.NONE
                        }
                      >
                        <InputGroup
                          id="cct-selector"
                          value={selector}
                          placeholder=".rm-title-display"
                          onChange={(e) => {
                            setSelector(e.target.value);
                            setComputed({});
                          }}
                        />
                      </FormGroup>
                      {picking && (
                        <Callout>
                          Click an element in Roam. Press Escape to cancel.
                        </Callout>
                      )}
                      {!selectorError && (
                        <div className="cct-properties">
                          {PROPERTIES.map(([property, label]) => (
                            <PropertyField
                              key={`${selector}:${property}`}
                              property={property}
                              label={label}
                              value={declarations[property] || ""}
                              placeholder={computed[property]}
                              onChange={changeProperty}
                            />
                          ))}
                        </div>
                      )}
                      <p className="cct-help">
                        Values such as 16px, 1.6, 12px 24px, or #336699 apply as
                        you type and override Roam’s theme. Clear a value to
                        remove that override. Use CSS source for advanced rules.
                      </p>
                    </div>
                  }
                />
                <Tab
                  id="source"
                  title="CSS source"
                  panel={
                    <CodeEditor
                      key={selected.id}
                      value={draftCss}
                      onChange={setDraftCss}
                    />
                  }
                />
              </Tabs>
              {syntaxError && (
                <Callout intent="danger">
                  {syntaxError} Saved styles remain applied until the CSS is
                  valid.
                </Callout>
              )}
              <div className="cct-actions">
                <span>
                  {library.suspended
                    ? "All styles paused"
                    : selected.enabled
                      ? "On · saved styles stay applied"
                      : "Off · turn on its switch to keep styles applied"}
                </span>
                <Button
                  outlined
                  disabled={!dirty}
                  onClick={() => {
                    setDraftCss(selected.css);
                    setDraftName(selected.name);
                    setDraftDescription(selected.description || "");
                  }}
                >
                  Revert
                </Button>
                <Button
                  intent="primary"
                  icon="floppy-disk"
                  disabled={!dirty || !!syntaxError || !draftName.trim()}
                  onClick={saveDraft}
                >
                  Save
                </Button>
              </div>
            </>
          )}
        </main>
      </div>
      <footer className="cct-footer">
        Shortcuts: customize in Roam Settings → Hotkeys
      </footer>
    </div>
  );
  return (
    <>
      {library.dock === "popout" ? (
        open && (
          <Popout
            bounds={library.popoutBounds}
            onBoundsChange={(popoutBounds) =>
              persist((current) => ({ ...current, popoutBounds }))
            }
            onClose={close}
            actions={headerActions}
            cancelEpoch={renderEpoch}
          >
            {editor}
          </Popout>
        )
      ) : (
        <Drawer
          isOpen={open}
          onClose={close}
          position={position}
          size={
            library.dock === "bottom"
              ? `min(${library.bottomSize}px, calc(100vh - 24px))`
              : `min(${library.sideSize}px, calc(100vw - 24px))`
          }
          hasBackdrop={false}
          canOutsideClickClose={false}
          canEscapeKeyClose={false}
          enforceFocus={false}
          autoFocus={false}
          portalClassName="cct-portal"
          portalContainer={
            document.querySelector<HTMLElement>(".roam-lift-modal") ??
            document.body
          }
          className={`cct-drawer cct-${library.dock}`}
        >
          {editor}
        </Drawer>
      )}
      <Alert
        isOpen={!!pending}
        confirmButtonText="Discard / continue"
        cancelButtonText="Cancel"
        onCancel={() => setPending(null)}
        onConfirm={() => {
          const action = pending;
          setPending(null);
          action?.();
        }}
        intent="warning"
      >
        <p>
          Continue? Deleting a stylesheet removes its saved CSS. Switching or
          closing with unsaved edits discards those edits.
        </p>
      </Alert>
    </>
  );
};
export default App;
