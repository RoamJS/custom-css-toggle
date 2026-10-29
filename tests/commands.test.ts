import { describe, expect, it, vi } from "vitest";
import type { AddCommandOptions } from "roamjs-components/types/native";
import { registerCommands } from "../src/commands";

describe("native Roam commands", () => {
  it("registers the pause shortcut with Roam and dispatches both command callbacks", async () => {
    const commands = new Map<string, AddCommandOptions>();
    const open = vi.fn();
    const pause = vi.fn();
    await registerCommands({
      commandPalette: {
        addCommand: async (command) => {
          commands.set(command.label, command);
        },
        removeCommand: async ({ label }) => {
          commands.delete(label);
        },
      },
      open,
      pause,
    });

    const pauseCommand = commands.get("Custom CSS Toggle: Pause all CSS")!;
    expect(pauseCommand).toHaveProperty("default-hotkey", "defmod-alt-shift-c");
    expect(pauseCommand).not.toHaveProperty("disable-hotkey", true);
    expect(pauseCommand).not.toHaveProperty("defaultHotkey");

    pauseCommand.callback();
    expect(pause).toHaveBeenCalledOnce();
    expect(open).not.toHaveBeenCalled();
    commands.get("Custom CSS Toggle: Open editor")!.callback();
    expect(open).toHaveBeenCalledOnce();
  });
});
