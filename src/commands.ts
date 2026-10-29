import type { OnloadArgs } from "roamjs-components/types/native";

type CommandPalette = OnloadArgs["extensionAPI"]["ui"]["commandPalette"];

export const registerCommands = async ({
  commandPalette,
  open,
  pause,
}: {
  commandPalette: CommandPalette;
  open: () => void;
  pause: () => void;
}): Promise<void> => {
  await commandPalette.addCommand({
    label: "Custom CSS Toggle: Open editor",
    callback: open,
  });
  // Roam's native API uses kebab-case; roamjs-components types use camelCase.
  const pauseCommand = {
    label: "Custom CSS Toggle: Pause all CSS",
    callback: pause,
    "default-hotkey": "defmod-alt-shift-c",
  };
  await commandPalette.addCommand(pauseCommand);
};
