export default `
.cct-portal .bp3-overlay { pointer-events: none; }
.cct-portal .cct-drawer { pointer-events: auto; color: #182026; background: #fff; z-index: 19; }
.cct-editor-header { height: 48px; min-height: 48px; flex-shrink: 0; display: flex; align-items: center; gap: 6px; padding: 8px 12px; border-bottom: 1px solid #d8e1e8; }
.cct-editor-title { flex: 1; min-width: 0; display: flex; align-items: center; gap: 8px; }
.cct-editor-title h4 { min-width: 0; margin: 0; font-size: 16px; line-height: 20px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cct-editor-title > .bp3-icon { flex-shrink: 0; color: #5c7080; }
.cct-editor-header > .bp3-button { flex-shrink: 0; }
.cct-popout { position: fixed; z-index: 19; box-sizing: border-box; display: flex; flex-direction: column; overflow: hidden; color: #182026; background: #fff; border: 1px solid #ced9e0; border-radius: 6px; box-shadow: 0 4px 8px rgba(16,22,26,.2), 0 18px 46px 6px rgba(16,22,26,.2); pointer-events: auto; }
.cct-popout-header .cct-popout-move { flex: 1; min-width: 0; justify-content: flex-start; cursor: grab; touch-action: none; user-select: none; font-size: 16px; font-weight: 600; }
.cct-popout-move .bp3-button-text { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cct-popout-header .cct-popout-move:hover, .cct-popout-header .cct-popout-move:active { background: transparent; box-shadow: none; }
.cct-popout-header .cct-popout-move:active { cursor: grabbing; }
.cct-popout-content { display: flex; flex: 1; min-height: 0; overflow: hidden; }
.cct-popout-content > .cct-shell { flex: 1; min-width: 0; min-height: 0; height: auto; }
.cct-popout .cct-popout-resize { position: absolute; right: 1px; bottom: 1px; cursor: nwse-resize; touch-action: none; }
.cct-popout .cct-footer { padding-right: 28px; }
.cct-shell { display: flex; flex-direction: column; height: 100%; min-height: 0; position: relative; font-size: 13px; }
.cct-toolbar { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.cct-layout { display: flex; flex: 1; min-height: 0; overflow: hidden; }
.cct-library { box-sizing: border-box; flex-shrink: 0; display: flex; flex-direction: column; padding: 12px 8px; gap: 10px; background: #f6f8fa; }
.cct-library-resize { flex: 0 0 6px; background: #f6f8fa; border-right: 1px solid #d8e1e8; cursor: ew-resize; touch-action: none; }
.cct-library-resize:hover, .cct-library-resize:focus-visible { background: #137cbd; outline: none; }
.cct-library input[type=file] { display: none; }
.cct-library-heading { display: flex; align-items: center; justify-content: space-between; }
.cct-sheet-list { flex: 1; overflow: auto; min-height: 70px; }
.cct-sheet { display: flex; gap: 3px; align-items: center; margin: 2px 0; border-radius: 4px; padding: 4px; }
.cct-selected { background: #e1eff8; }
.cct-sheet .bp3-switch { margin: 0; padding: 0; flex-shrink: 0; }
.cct-sheet .bp3-switch .bp3-control-indicator { margin: 0; }
.cct-sheet .bp3-button { min-width: 0; text-align: left; flex: 1; justify-content: start; }
.cct-sheet .bp3-button-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cct-workspace { flex: 1; min-width: 0; display: flex; flex-direction: column; padding: 12px; gap: 12px; }
.cct-file-heading { display: flex; gap: 4px; }
.cct-file-heading .bp3-input-group { flex: 1; min-width: 0; }
.cct-description { flex-shrink: 0; }
.cct-description summary { color: #5c7080; cursor: pointer; width: fit-content; display: flex; align-items: center; gap: 6px; list-style: none; }
.cct-description summary::before { content: "›"; font-size: 16px; line-height: 1; }
.cct-description[open] summary::before { transform: rotate(90deg); }
.cct-description textarea { margin-top: 8px; resize: vertical; max-height: 160px; }
.cct-sheet-shortcut.bp3-switch { margin: 0; }
.cct-preview-row { display: flex; gap: 4px; flex-wrap: wrap; align-items: center; }
.cct-preview-row .bp3-switch { margin: 0; }
.cct-preview-row span { color: #526b7a; font-size: 11px; }
.cct-workspace > .bp3-tabs { display: flex; flex: 1; flex-direction: column; min-height: 0; }
.cct-workspace .bp3-tab-panel { flex: 1; min-height: 0; overflow: auto; margin-top: 12px; padding: 4px; box-sizing: border-box; scroll-padding: 4px; }
.cct-code { height: 100%; min-height: 150px; border: 1px solid #ced9e0; border-radius: 4px; overflow: hidden; }
.cct-visual { display: flex; flex-direction: column; gap: 12px; }
.cct-visual .bp3-form-group { margin: 0; }
.cct-properties { display: grid; grid-template-columns: repeat(auto-fit, minmax(125px, 1fr)); gap: 12px; }
.cct-property-input { display: flex; gap: 6px; align-items: center; }
.cct-property-input input[type=color] { width: 28px; height: 28px; padding: 0; border: 0; flex-shrink: 0; cursor: pointer; }
.cct-property-input .bp3-input-group { flex: 1; min-width: 0; }
.cct-help, .cct-empty { color: #526b7a; font-size: 11px; line-height: 1.5; margin: 0; }
.cct-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; justify-content: flex-end; border-top: 1px solid #d8e1e8; padding-top: 10px; }
.cct-actions > span { flex: 1 1 160px; margin-right: auto; color: #526b7a; font-size: 11px; }
.cct-footer { background: #ebeceb; border-top: 1px solid #d3d4d4; padding: 6px 12px; text-align: right; font-size: 11px; color: #5c7080; }
.cct-welcome { margin: auto; text-align: center; max-width: 280px; }
.cct-resize { position: absolute; z-index: 2; touch-action: none; }
.cct-right .cct-resize { left: 0; top: 0; bottom: 0; width: 6px; cursor: ew-resize; }
.cct-left .cct-resize { right: 0; top: 0; bottom: 0; width: 6px; cursor: ew-resize; }
.cct-bottom .cct-resize { top: 0; left: 0; right: 0; height: 6px; cursor: ns-resize; }
.cct-resize:focus { background: #137cbd; outline: none; }
.cct-highlight { pointer-events: none; position: fixed; z-index: 2147483647; border: 2px solid #137cbd; background: rgba(19,124,189,.12); }
@media (max-width: 540px) { .cct-workspace { padding: 8px; } }
`;
