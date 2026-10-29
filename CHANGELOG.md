# Changelog

All notable user-facing changes are documented here using Keep a Changelog conventions.

## [Unreleased]

### Added

- **Personal stylesheets** - Create, import, export, and independently toggle CSS files without changing a multiplayer graph's shared styles.
- **Live editing** - Preview and revert changes using a visual property editor, color pickers, and a syntax-aware CSS source editor.
- **Element picker** - Select something in Roam to get a CSS selector and edit its appearance.
- **Flexible drawer** - Dock the editor left, right, or bottom and resize it with a pointer or keyboard.
- **Pause all** - Remove personal styles with one action or an emergency keyboard shortcut.

### Changed

- Resize the stylesheet list separately from the drawer and remember its width for long titles.
- Customize or clear the pause shortcut through Roam's native Hotkeys settings.
- Pick reusable Roam class selectors even when several elements, such as daily-note titles, share the class.
- Give visual property edits priority over Roam's theme so changes preview with simple class selectors.
- Clarify whether a stylesheet stays applied outside the editor and simplify the toolbar.
