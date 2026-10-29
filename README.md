# Custom CSS Toggle

Create and toggle personal CSS stylesheets in Roam Research without changing anyone else's view of a multiplayer graph.

## Usage

1. Open the command palette and run **Custom CSS Toggle: Open editor**, or use **Open CSS editor** in the extension settings.
2. Create a stylesheet, import a `.css` file, or try **Hide Roam Sidebar Logo** and **Hide Topbar Icons**. Files and examples start disabled. The topbar example keeps the page-search field usable.
3. Expand **Description** to add notes about what the file changes. Its text is stored with the stylesheet using **Save** and **Revert**. Use **Select element** and click something in Roam, or type a CSS selector. Adjust colors, fonts, spacing, and sizing in **Visual editor**. Choose **Display → None (hide element)** to hide matching elements, or **Use page style** to remove that display override. Use **CSS source** for any other CSS, with syntax highlighting and completion.
4. Use **Live preview** to try valid unsaved edits on either an enabled or disabled stylesheet. Turn it off to compare against saved enabled styles. **Save** keeps edits; **Revert** restores saved content. Enable the file's switch to keep it applied after closing the editor. Multiple enabled files stack in list order.
5. The compact header keeps the title, position controls, pause, and close in one row. Use the position icons to dock left, right, or bottom, or choose **Popout** for a floating editor inside Roam. Drag the popout's title bar to move it and its bottom-right corner to resize it. Docked editors resize from their edge. Drag the divider beside the stylesheet list to give long titles more room. Movement and resize handles support arrow keys when focused. Position and size are remembered in this browser.

Unsaved edits prompt before switching stylesheets or closing. Changing the editor's position keeps the current draft. Previewing a disabled file temporarily applies it while the editor is open. Turning a stylesheet off also stops its preview; you can turn **Live preview** back on to try it temporarily. Closing the editor restores the saved enabled styles.

Use **Pause all**, the command **Custom CSS Toggle: Pause all CSS**, or its default shortcut **Ctrl/⌘ + Alt + Shift + C** to remove personal CSS immediately. Change or clear this native Roam shortcut in **Settings → Hotkeys**. The shortcut works even if your CSS hides the editor. Emergency pause also cancels pending confirmations, resizing, and imports already being read. Resume with **Resume CSS**.

The command palette also offers **Custom CSS Toggle: Unpause all CSS** and **Custom CSS Toggle: Toggle all CSS**. Assign their keys in **Settings → Hotkeys**. Toggle all switches between paused and unpaused without changing which individual stylesheets are enabled.

For a stylesheet shortcut, select the file and turn on **Enable Command Palette Shortcut**, then find **Custom CSS Toggle: Toggle stylesheet [name]** in **Settings → Hotkeys** and assign its keys. Duplicate names receive **(2)**, **(3)**, and so on. The command toggles only that stylesheet, including when the editor is closed. It does not override a global pause. Turn off **Enable Command Palette Shortcut** to remove the command, or delete the stylesheet to remove it entirely. Its command name stays fixed when the stylesheet is renamed, so an existing key binding keeps its identity. No default keys are assigned to individual files.

## Personal storage

Styles and enabled states are stored locally in this browser, separately for each graph and signed-in Roam user. No CSS, settings, or blocks are written to `roam/css` or elsewhere in the graph. The two shipped examples are added once to existing libraries; deleting one keeps it removed. Clearing browser data removes the library. Use **Export CSS file** and **Import .css** to back up styles or move them to another browser/device. Uninstalling/disabling the extension removes applied styles; saved local files remain until browser data is cleared.

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
