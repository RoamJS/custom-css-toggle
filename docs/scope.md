# Custom CSS Toggle

Source: `apps/custom-css-toggle`, cloned from `RoamJS/extension-base`.

## Acceptance criteria

- Create, rename, delete, import, export, and independently enable multiple CSS stylesheets.
- Persist personal CSS by graph and signed-in user in this browser; never write graph blocks or the shared `roam/css` page. Browser-local storage deliberately does not sync between devices.
- Preview unsaved CSS immediately in the graph; save explicitly, revert edits, and restore saved enabled CSS when the drawer closes. New/imported files start disabled.
- Provide a visual property editor with color pickers and common typography, spacing, and sizing controls, plus a syntax-aware CSS source editor.
- Provide a nonmodal Blueprint 3 drawer dockable left, bottom, or right, with pointer and keyboard resizing.
- Pick a visible element without triggering its normal click action. Prefer a unique ID, then unique class(es), then a unique structural selector; show the selector and match count. Escape cancels.
- Provide a persistent pause-all control, emergency keyboard shortcut, and complete unload cleanup.
- Verify persistence, user/graph isolation, source/visual editing, toggles, preview/revert/save, picker, resizing, and nearby native Roam interactions.

## Catalog check

Checked the complete public `Roam-Research/roam-depot` registry on 2026-10-28 (216 entries). Searched metadata for CSS, theme, style, and customization and reviewed candidate documentation. No exact match found.

Closest candidates:

- CSS Dark Mode Toggle: toggles `.rm-dark-theme`; no general stylesheet library/editor.
- Tag Painter: visual tag styling, limited to tags.
- Roam Power Themes / Roam Studio / blueprint: theme libraries and appearance settings.
- Custom Dark Mode: per-user color-only theme settings.
- Live Themes: AI requests, preview, themes, and picking, but active styles are written to shared `roam/css` blocks.
- Workspaces: CSS associated with workspace selection, without a general visual/source CSS editor.

## Implementation choices

Blueprint 3 Drawer supports position, size, and nonmodal focus behavior; it has no built-in resize handle. A scoped handle adds pointer and keyboard resizing. CodeMirror 6 supplies CSS syntax highlighting/completion and editing history. PostCSS parses stylesheets and updates visual properties without regex replacement. The picker is small native DOM code; no external picker package is needed.

Visual edits target a top-level rule matching the chosen selector. Advanced nested rules, media queries, and `!important` are available in the source editor. A selector chosen now may need updating if Roam changes its DOM. Personal CSS may still be overridden by more specific shared rules; source editing supports normal CSS specificity and `!important`.
