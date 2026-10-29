# Custom CSS Toggle

Create and toggle personal CSS stylesheets in Roam Research without changing anyone else's view of a multiplayer graph.

## Usage

1. Open the command palette and run **Custom CSS Toggle: Open editor**, or use **Open CSS editor** in the extension settings.
2. Create a stylesheet or import a `.css` file. Files start disabled.
3. Use **Select element** and click something in Roam, or type a CSS selector. Adjust colors, fonts, spacing, and sizing in **Visual editor**. Use **CSS source** for any other CSS, with syntax highlighting and completion.
4. **Live preview** shows valid edits immediately. **Save** keeps them; **Revert** restores saved content. Enable the file's switch to keep it applied after closing the drawer. Multiple enabled files stack in list order.
5. Dock left, right, or bottom. Drag the edge to resize the drawer, or drag the divider beside the stylesheet list to give long titles more room. Both support arrow keys when focused. The list width is remembered in this browser.

Unsaved edits prompt before switching or closing. Previewing a disabled file temporarily applies it while the editor is open. Turning preview off or closing the drawer restores the saved enabled styles.

Use **Pause all**, the command **Custom CSS Toggle: Pause all CSS**, or its default shortcut **Ctrl/⌘ + Alt + Shift + C** to remove personal CSS immediately. Change or clear this native Roam shortcut in **Settings → Hotkeys**. The shortcut works even if your CSS hides the editor. Emergency pause also cancels pending confirmations, resizing, and imports already being read. Resume with **Resume CSS**.

## Personal storage

Styles and enabled states are stored locally in this browser, separately for each graph and signed-in Roam user. No CSS, settings, or blocks are written to `roam/css` or elsewhere in the graph. Clearing browser data removes the library. Use **Export CSS file** and **Import .css** to back up styles or move them to another browser/device. Uninstalling/disabling the extension removes applied styles; saved local files remain until browser data is cleared.

The picker prefers a unique ID, then a stable class (favoring native Roam classes), then a structural selector. Classes can target several elements: picking a daily-note title returns `.rm-title-display`, so your rule can style all page titles. The editor shows how many elements match, and you can edit the selector to narrow its scope. Press Escape or click **Cancel selection** to leave picker mode. The picker cannot inspect inside embedded frames or shadow roots. Roam DOM changes can invalidate selectors.

Visual controls edit a matching top-level CSS rule and add `!important` to the edited property so simple selectors override Roam's theme. A blank visual field removes its override. Use CSS source to control priority or write media queries, nested rules, pseudo-elements, and custom properties. CSS follows the normal cascade and can load remote resources if you put URLs or imports in it.

## Development

```sh
npm ci --ignore-scripts
npm run typecheck
npm test
npm run build:roam
```

Load `dist` as a Roam Depot developer extension. Publishing, deployment, and Depot submission are separate from this repository's read-only CI checks.
