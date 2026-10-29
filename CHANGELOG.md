# Changelog

All notable user-facing changes are documented here using Keep a Changelog conventions.

## [Unreleased]

### Added

- **Stylesheet descriptions** - Keep notes in an expandable field saved with each stylesheet.

- **Example stylesheets** - Ship disabled examples to hide the Roam sidebar logo or topbar icons.
- **Personal stylesheets** - Create, import, export, and independently toggle CSS files without changing a multiplayer graph's shared styles.
- **Live editing** - Preview and revert changes using a visual property editor, color pickers, and a syntax-aware CSS source editor.
- **Display control** - Hide matching elements with `display: none`, choose common layout modes, or restore the page's display style.
- **Element picker** - Select something in Roam to get a CSS selector and edit its appearance.
- **Flexible drawer** - Dock the editor left, right, or bottom and resize it with a pointer or keyboard.
- **Popout editor** - Move and resize a floating editor inside Roam, with its position and size remembered locally.
- **Pause all** - Remove personal styles with one action or an emergency keyboard shortcut.
- **Keyboard shortcuts** - Add a native Roam toggle command for any stylesheet, and assign shortcuts to pause, unpause, or toggle all personal CSS.

### Changed

- Combine the title, position controls, pause, and close in one compact header.

- Choose the editor's position using labeled icon buttons, and download CSS using a download icon.
- Keep Live preview optional for every stylesheet so unsaved edits can be compared with saved styles. Turning a stylesheet off also stops its preview.
- Use a single **Enable Command Palette Shortcut** switch and readable command names, with numeric suffixes only for duplicates.
- Resize the stylesheet list separately from the drawer and remember its width for long titles.
- Customize or clear the pause shortcut through Roam's native Hotkeys settings.
- Pick reusable Roam class selectors even when several elements, such as daily-note titles, share the class.
- Give visual property edits priority over Roam's theme so changes preview with simple class selectors.
- Clarify whether a stylesheet stays applied outside the editor and simplify the toolbar.

### Fixed

- Leave room for input focus outlines inside the scrolling editor.
- Update CSS parsing dependencies to patched versions.
- Keep the popout below Roam command palettes and confirmation dialogs.
- Keep docked editors below native Roam overlays so command-palette shortcuts remain clickable.
- Keep the popout title bar background unchanged while hovering or dragging.
