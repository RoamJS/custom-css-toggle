import React from "react";
import ReactDOM from "react-dom";
import runExtension from "roamjs-components/util/runExtension";
import { render as renderToast } from "roamjs-components/components/Toast";
import App, { EditorHandlers } from "~/App";
import { applyStyles, Library, readLibrary, storageKey } from "~/model";
import { registerCommands } from "~/commands";
import styles from "~/styles";

export default runExtension(async ({ extensionAPI }) => {
  let key: string;
  let initial: Library;
  try {
    key = storageKey({
      graph: window.roamAlphaAPI.graph.name,
      user: window.roamAlphaAPI.user.uid() || "",
    });
    initial = readLibrary(localStorage.getItem(key));
  } catch (error) {
    renderToast({
      id: "custom-css-toggle-error",
      content:
        error instanceof Error
          ? error.message
          : "Could not open personal CSS storage.",
      intent: "danger",
    });
    return { unload: () => undefined };
  }
  const identity = key;
  const sameIdentity = (): boolean => {
    try {
      return (
        storageKey({
          graph: window.roamAlphaAPI.graph.name,
          user: window.roamAlphaAPI.user.uid() || "",
        }) === identity
      );
    } catch {
      return false;
    }
  };
  const root = document.createElement("div");
  root.id = "roamjs-custom-css-toggle";
  root.dataset.cctOwned = "true";
  const cssHost = document.createElement("div");
  cssHost.dataset.cctStyles = "true";
  const uiStyle = document.createElement("style");
  uiStyle.textContent = styles;
  document.head.appendChild(uiStyle);
  document.body.append(root, cssHost);
  let handlers: EditorHandlers = {
    open: (): void => undefined,
    emergency: (): void => undefined,
    unpause: (): void => undefined,
    toggleAll: (): void => undefined,
    toggleSheet: (): void => undefined,
  };
  let commands: Awaited<ReturnType<typeof registerCommands>> | undefined;
  let currentSheets = initial.sheets;
  let unloaded = false;
  const shortcutError = (): void => {
    if (unloaded) return;
    renderToast({
      id: "custom-css-toggle-shortcuts",
      content:
        "Could not update keyboard shortcut commands. Reload Roam to retry.",
      intent: "danger",
    });
  };
  const save = (library: Library): void => {
    if (!sameIdentity())
      throw new Error(
        "The current graph or user changed. Reload Roam to continue.",
      );
    localStorage.setItem(key, JSON.stringify(library));
    currentSheets = library.sheets;
    void commands?.sync(currentSheets).catch(shortcutError);
  };
  ReactDOM.render(
    <App
      initial={initial}
      save={save}
      apply={(library, preview) =>
        applyStyles({
          host: cssHost,
          library: sameIdentity() ? library : { ...library, suspended: true },
          preview,
        })
      }
      register={(next) => {
        handlers = next;
      }}
    />,
    root,
  );
  extensionAPI.settings.panel.create({
    tabTitle: "Custom CSS Toggle",
    settings: [
      {
        id: "open-editor",
        name: "Personal stylesheets",
        description:
          "Create, preview, and toggle CSS just for you in this browser.",
        action: {
          type: "button",
          content: "Open CSS editor",
          onClick: () => handlers.open(),
        },
      },
    ],
  });
  try {
    commands = await registerCommands({
      commandPalette: extensionAPI.ui.commandPalette,
      open: () => {
        if (sameIdentity()) handlers.open();
      },
      pause: () => {
        if (sameIdentity()) handlers.emergency();
      },
      unpause: () => {
        if (sameIdentity()) handlers.unpause();
      },
      toggleAll: () => {
        if (sameIdentity()) handlers.toggleAll();
      },
      toggleSheet: (id) => {
        if (sameIdentity()) handlers.toggleSheet(id);
      },
      sheets: initial.sheets,
    });
    if (unloaded) await commands.dispose();
    else await commands.sync(currentSheets);
  } catch {
    shortcutError();
  }
  // A graph/account switch must not carry this user's styles into another context.
  const identityWatch = window.setInterval(() => {
    if (!sameIdentity()) cssHost.replaceChildren();
  }, 500);
  return {
    unload: () => {
      unloaded = true;
      void commands?.dispose().catch(() => undefined);
      window.clearInterval(identityWatch);
      ReactDOM.unmountComponentAtNode(root);
      root.remove();
      cssHost.remove();
      uiStyle.remove();
    },
  };
});
