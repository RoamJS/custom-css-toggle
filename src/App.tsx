import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Button,
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
} from "@blueprintjs/core";
import CodeEditor from "~/CodeEditor";
import { createSheet, Dock, Library, Preview, Stylesheet } from "~/model";
import {
  readDeclarations,
  updateDeclaration,
  validateCss,
  validateSelector,
} from "~/css";
import { PickedElement, startPicker } from "~/picker";

type Props = {
  initial: Library;
  save: (library: Library) => void;
  apply: (library: Library, preview?: Preview) => void;
  register: (handlers: { open: () => void; emergency: () => void }) => void;
};
const PROPERTIES = [
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
        <InputGroup
          id={`cct-${property}`}
          value={draft}
          placeholder={placeholder || "Unchanged"}
          intent={invalid ? Intent.DANGER : Intent.NONE}
          onChange={(e) => change(e.target.value)}
        />
      </div>
    </FormGroup>
  );
};
const App = ({ initial, save, apply, register }: Props): React.ReactElement => {
  const [library, setLibrary] = useState(initial);
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(initial.sheets[0]?.id || "");
  const [draftCss, setDraftCss] = useState(initial.sheets[0]?.css || "");
  const [draftName, setDraftName] = useState(initial.sheets[0]?.name || "");
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
    !!selected && (draftCss !== selected.css || draftName !== selected.name);
  const live =
    open && preview && selected && !syntaxError
      ? { id: selected.id, css: draftCss }
      : undefined;
  useEffect(() => {
    apply(library, live);
  }, [library, open, preview, selectedId, draftCss, syntaxError]);
  useEffect(
    () => () => {
      pickerCleanup.current?.();
      resizeCleanup.current?.();
    },
    [],
  );
  const persist = (next: Library): boolean => {
    try {
      save(next);
      setLibrary(next);
      setError("");
      return true;
    } catch {
      setError(
        "Could not save to browser storage. Your changes are still open; export a copy before closing.",
      );
      return false;
    }
  };
  const resetDraft = (sheet?: Stylesheet): void => {
    setSelectedId(sheet?.id || "");
    setDraftCss(sheet?.css || "");
    setDraftName(sheet?.name || "");
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
      setOpen(false);
      resetDraft(selected);
    });
  const emergency = (): void => {
    pickerCleanup.current?.();
    setPreview(false);
    const next = { ...library, suspended: true };
    // Removing styles must work even when browser storage is full or unavailable.
    apply(next);
    setLibrary(next);
    try {
      save(next);
      setError("");
    } catch {
      setError(
        "CSS paused for this session. Browser storage could not save the pause.",
      );
    }
    setOpen(true);
  };
  useEffect(() => {
    register({ open: () => setOpen(true), emergency });
  }, [library]);
  const addSheet = (sheet: Stylesheet): void => {
    if (persist({ ...library, sheets: [...library.sheets, sheet] }))
      resetDraft(sheet);
  };
  const saveDraft = (): void => {
    if (!selected || syntaxError || !draftName.trim()) return;
    persist({
      ...library,
      sheets: library.sheets.map((s) =>
        s.id === selectedId
          ? { ...s, css: draftCss, name: draftName.trim() }
          : s,
      ),
    });
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
      next = { ...library, sideSize, bottomSize };
      setLibrary(next);
    };
    const stop = (): void => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
      resizeCleanup.current = null;
      persist(next);
    };
    resizeCleanup.current = stop;
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
  };
  const resizeKey = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key))
      return;
    e.preventDefault();
    if (library.dock === "bottom")
      persist({
        ...library,
        bottomSize: Math.max(
          240,
          library.bottomSize + (e.key === "ArrowUp" ? 24 : -24),
        ),
      });
    else
      persist({
        ...library,
        sideSize: Math.max(
          320,
          library.sideSize +
            ((e.key === "ArrowRight") === (library.dock === "left") ? 24 : -24),
        ),
      });
  };
  const position =
    library.dock === "left"
      ? Position.LEFT
      : library.dock === "bottom"
        ? Position.BOTTOM
        : Position.RIGHT;
  return (
    <>
      <Drawer
        isOpen={open}
        onClose={close}
        title="Custom CSS Toggle"
        icon="style"
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
        className={`cct-drawer cct-${library.dock}`}
      >
        <div data-cct-owned="true" className="cct-shell">
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
          <div className="cct-toolbar">
            <span className="cct-personal">Only you · this browser</span>
            <HTMLSelect
              aria-label="Editor position"
              value={library.dock}
              onChange={(e) => {
                pickerCleanup.current?.();
                persist({ ...library, dock: e.target.value as Dock });
              }}
              options={[
                { label: "Dock left", value: "left" },
                { label: "Dock bottom", value: "bottom" },
                { label: "Dock right", value: "right" },
              ]}
            />
            <Button
              small
              outlined
              icon={library.suspended ? "play" : "pause"}
              onClick={() =>
                library.suspended
                  ? persist({ ...library, suspended: false })
                  : emergency()
              }
            >
              {library.suspended ? "Resume CSS" : "Pause all"}
            </Button>
          </div>
          {error && <Callout intent="danger">{error}</Callout>}
          {library.suspended && (
            <Callout intent="warning">
              All personal CSS is paused. Resume when ready.
            </Callout>
          )}
          <div className="cct-layout">
            <aside className="cct-library" aria-label="Stylesheets">
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
                      onChange={() =>
                        persist({
                          ...library,
                          sheets: library.sheets.map((s) =>
                            s.id === sheet.id
                              ? { ...s, enabled: !s.enabled }
                              : s,
                          ),
                        })
                      }
                    />
                    <Button
                      minimal
                      active={selectedId === sheet.id}
                      text={sheet.name}
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
            </aside>
            <main className="cct-workspace">
              {!selected ? (
                <div className="cct-welcome">
                  <h3>Your Roam, your styles</h3>
                  <p>
                    Change what you see without changing your collaborators’
                    view.
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
                      icon="export"
                      aria-label="Export CSS file"
                      onClick={exportSheet}
                    />
                    <Button
                      minimal
                      icon="trash"
                      aria-label="Delete stylesheet"
                      onClick={() =>
                        setPending(() => () => {
                          const sheets = library.sheets.filter(
                            (s) => s.id !== selected.id,
                          );
                          if (persist({ ...library, sheets }))
                            resetDraft(sheets[0]);
                        })
                      }
                    />
                  </div>
                  <div className="cct-preview-row">
                    <Switch
                      label="Live preview"
                      checked={preview}
                      disabled={library.suspended}
                      onChange={() => setPreview(!preview)}
                    />
                    <span role="status">
                      {preview && !library.suspended
                        ? "Previewing in your graph"
                        : "Showing saved styles"}
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
                            {picking
                              ? "Cancel selection (Esc)"
                              : "Select element"}
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
                            Values such as 16px, 1.6, 12px 24px, or #336699
                            apply as you type. Clear a value to remove that
                            override. Use CSS source for advanced rules.
                          </p>
                        </div>
                      }
                    />
                    <Tab
                      id="source"
                      title="CSS source"
                      panel={
                        <CodeEditor value={draftCss} onChange={setDraftCss} />
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
                      {selected.enabled
                        ? "Enabled after closing"
                        : "Disabled after closing"}
                    </span>
                    <Button
                      outlined
                      disabled={!dirty}
                      onClick={() => {
                        setDraftCss(selected.css);
                        setDraftName(selected.name);
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
            Emergency pause: Ctrl/⌘ + Alt + Shift + C
          </footer>
        </div>
      </Drawer>
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
