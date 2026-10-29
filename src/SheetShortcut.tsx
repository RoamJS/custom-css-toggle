import React from "react";
import { Switch } from "@blueprintjs/core";
import { Stylesheet } from "./model";

type Props = {
  sheet: Stylesheet;
  onChange: (enabled: boolean) => void;
};

const SheetShortcut = ({ sheet, onChange }: Props): React.ReactElement => (
  <Switch
    className="cct-sheet-shortcut"
    label="Enable Command Palette Shortcut"
    checked={sheet.shortcut?.enabled ?? false}
    title="Assign its keyboard shortcut in Roam Settings → Hotkeys."
    onChange={(event) => onChange(event.currentTarget.checked)}
  />
);

export default SheetShortcut;
