import React from "react";
import ReactDOM from "react-dom";
import runExtension from "roamjs-components/util/runExtension";
import { render as renderToast } from "roamjs-components/components/Toast";
import App from "~/App";
import { applyStyles, Library, readLibrary, storageKey } from "~/model";
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
  let handlers = {
    open: (): void => undefined,
    emergency: (): void => undefined,
  };
  const save = (library: Library): void => {
    if (!sameIdentity())
      throw new Error(
        "The current graph or user changed. Reload Roam to continue.",
      );
    localStorage.setItem(key, JSON.stringify(library));
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
  extensionAPI.ui.commandPalette.addCommand({
    label: "Custom CSS Toggle: Open editor",
    callback: () => handlers.open(),
  });
  extensionAPI.ui.commandPalette.addCommand({
    label: "Custom CSS Toggle: Pause all CSS",
    callback: () => handlers.emergency(),
  });
  const emergencyKey = (e: KeyboardEvent): void => {
    if (
      (e.ctrlKey || e.metaKey) &&
      e.altKey &&
      e.shiftKey &&
      e.code === "KeyC"
    ) {
      e.preventDefault();
      e.stopImmediatePropagation();
      handlers.emergency();
    }
  };
  window.addEventListener("keydown", emergencyKey, true);
  // A graph/account switch must not carry this user's styles into another context.
  const identityWatch = window.setInterval(() => {
    if (!sameIdentity()) cssHost.replaceChildren();
  }, 500);
  return {
    unload: () => {
      window.clearInterval(identityWatch);
      window.removeEventListener("keydown", emergencyKey, true);
      ReactDOM.unmountComponentAtNode(root);
      root.remove();
      cssHost.remove();
      uiStyle.remove();
    },
  };
});
