# Custom CSS Toggle

Create and toggle personal CSS stylesheets in Roam Research without changing anyone else's view of a multiplayer graph.

## Usage

1. Open the command palette and run **Custom CSS Toggle: Open editor**, or use **Open CSS editor** in the extension settings.
2. Create a stylesheet or import a `.css` file. Files start disabled.
3. Use **Select element** and click something in Roam, or type a CSS selector. Adjust colors, fonts, spacing, and sizing in **Visual editor**. Use **CSS source** for any other CSS, with syntax highlighting and completion.
4. **Live preview** shows valid edits immediately. **Save** keeps them; **Revert** restores saved content. Enable the file's switch to keep it applied after closing the drawer. Multiple enabled files stack in list order.
5. Dock left, right, or bottom. Drag the edge to resize; focus the edge and use arrow keys for keyboard resizing.

Unsaved edits prompt before switching or closing. Previewing a disabled file temporarily applies it while the editor is open. Turning preview off or closing the drawer restores the saved enabled styles.

Use **Pause all**, the command **Custom CSS Toggle: Pause all CSS**, or **Ctrl/⌘ + Alt + Shift + C** to remove personal CSS immediately. The shortcut works even if your CSS hides the editor. Emergency pause also cancels pending confirmations and imports already being read. Resume with **Resume CSS**.

## Personal storage

Styles and enabled states are stored locally in this browser, separately for each graph and signed-in Roam user. No CSS, settings, or blocks are written to `roam/css` or elsewhere in the graph. Clearing browser data removes the library. Use **Export CSS file** and **Import .css** to back up styles or move them to another browser/device. Uninstalling/disabling the extension removes applied styles; saved local files remain until browser data is cleared.

The picker prefers a unique ID, then unique classes, then a structural selector. You can edit its selector to target a group; the editor shows how many elements match. Press Escape or click **Cancel selection** to leave picker mode. The picker cannot inspect inside embedded frames or shadow roots. Roam DOM changes can invalidate selectors.

Visual controls edit a matching top-level CSS rule; use source for media queries, nested rules, pseudo-elements, custom properties, and `!important`. A blank visual field removes its override. CSS follows the normal cascade and can load remote resources if you put URLs or imports in it.

## Development

```sh
npm ci --ignore-scripts
npm run typecheck
npm test
npm run build:roam
```

Load `dist` as a Roam Depot developer extension. Publishing, deployment, and Depot submission are separate from this repository's read-only CI checks.
