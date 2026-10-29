import type { OnloadArgs } from "roamjs-components/types/native";
import type { Stylesheet } from "./model";

type CommandPalette = OnloadArgs["extensionAPI"]["ui"]["commandPalette"];
type NativeCommand = Parameters<CommandPalette["addCommand"]>[0] & {
  "default-hotkey"?: string;
};
export type CommandController = {
  sync: (sheets: Stylesheet[]) => Promise<void>;
  dispose: () => Promise<void>;
};

export const registerCommands = async ({
  commandPalette,
  open,
  pause,
  unpause,
  toggleAll,
  toggleSheet,
  sheets,
}: {
  commandPalette: CommandPalette;
  open: () => void;
  pause: () => void;
  unpause: () => void;
  toggleAll: () => void;
  toggleSheet: (id: string) => void;
  sheets: Stylesheet[];
}): Promise<CommandController> => {
  let disposed = false;
  let queue: Promise<void> = Promise.resolve();
  let activeSheetIds = new Map<string, string>();
  const registered = new Set<string>();
  // An API rejection may occur after registration, so retain attempted labels
  // until removal succeeds as well as labels whose registration was confirmed.
  const owned = new Set<string>();
  const guard =
    (callback: () => void): (() => void) =>
    () => {
      if (!disposed) callback();
    };
  const globals: NativeCommand[] = [
    {
      label: "Custom CSS Toggle: Open editor",
      callback: guard(open),
    },
    {
      label: "Custom CSS Toggle: Pause all CSS",
      callback: guard(pause),
      // Roam's native API uses kebab-case; its installed types use camelCase.
      "default-hotkey": "defmod-alt-shift-c",
    },
    {
      label: "Custom CSS Toggle: Unpause all CSS",
      callback: guard(unpause),
    },
    {
      label: "Custom CSS Toggle: Toggle all CSS",
      callback: guard(toggleAll),
    },
  ];
  const globalLabels = new Set(globals.map(({ label }) => label));

  const enqueue = (operation: () => Promise<void>): Promise<void> => {
    const result = queue.then(operation);
    queue = result.catch(() => undefined);
    return result;
  };
  const remove = async (label: string): Promise<void> => {
    await commandPalette.removeCommand({ label });
    owned.delete(label);
    registered.delete(label);
  };
  const sync = (nextSheets: Stylesheet[]): Promise<void> => {
    if (disposed) return Promise.resolve();
    const sheetIds = new Map<string, string>();
    for (const sheet of nextSheets) {
      if (!sheet.shortcut?.enabled) continue;
      const { label } = sheet.shortcut;
      if (!label.trim() || globalLabels.has(label) || sheetIds.has(label)) {
        return Promise.reject(
          new Error("Stylesheet command labels must be unique."),
        );
      }
      sheetIds.set(label, sheet.id);
    }
    activeSheetIds = sheetIds;
    const commands: NativeCommand[] = [
      ...globals,
      ...Array.from(sheetIds.keys(), (label) => ({
        label,
        callback: guard(() => {
          const id = activeSheetIds.get(label);
          if (id !== undefined) toggleSheet(id);
        }),
      })),
    ];
    const desiredLabels = new Set(commands.map(({ label }) => label));
    return enqueue(async () => {
      if (disposed) return;
      for (const label of owned) {
        if (!desiredLabels.has(label) || !registered.has(label)) {
          await remove(label);
        }
      }
      for (const command of commands) {
        if (disposed) return;
        if (registered.has(command.label)) continue;
        owned.add(command.label);
        await commandPalette.addCommand(command);
        registered.add(command.label);
      }
    });
  };
  const dispose = (): Promise<void> => {
    disposed = true;
    activeSheetIds.clear();
    return enqueue(async () => {
      let failure: unknown;
      for (const label of owned) {
        try {
          await remove(label);
        } catch (error) {
          failure ??= error;
        }
      }
      if (failure !== undefined) throw failure;
    });
  };

  try {
    await sync(sheets);
  } catch (error) {
    await dispose().catch(() => undefined);
    throw error;
  }
  return { sync, dispose };
};
