import { describe, expect, it, vi } from "vitest";
import type { AddCommandOptions } from "roamjs-components/types/native";
import { registerCommands } from "../src/commands";
import type { Stylesheet } from "../src/model";

const createHarness = () => {
  const commands = new Map<string, AddCommandOptions>();
  const addCommand = vi.fn(
    async (command: AddCommandOptions): Promise<void> => {
      commands.set(command.label, command);
    },
  );
  const removeCommand = vi.fn(
    async ({ label }: { label: string }): Promise<void> => {
      commands.delete(label);
    },
  );
  const callbacks = {
    open: vi.fn(),
    pause: vi.fn(),
    unpause: vi.fn(),
    toggleAll: vi.fn(),
    toggleSheet: vi.fn(),
  };
  return {
    commands,
    addCommand,
    removeCommand,
    ...callbacks,
    register: (sheets: Stylesheet[] = []) =>
      registerCommands({
        commandPalette: { addCommand, removeCommand },
        ...callbacks,
        sheets,
      }),
  };
};
const createSheet = (id: string): Stylesheet => ({
  id,
  name: "Reading theme",
  css: "",
  enabled: false,
  shortcut: {
    label: `Custom CSS Toggle: Toggle Reading theme [${id}]`,
    enabled: true,
  },
});
const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

describe("native Roam commands", () => {
  it("dispatches all global commands and assigns only the existing native pause default", async () => {
    const h = createHarness();
    await h.register();
    const pauseCommand = h.commands.get("Custom CSS Toggle: Pause all CSS")!;
    expect(pauseCommand).toHaveProperty("default-hotkey", "defmod-alt-shift-c");
    expect(pauseCommand).not.toHaveProperty("disable-hotkey", true);
    expect(pauseCommand).not.toHaveProperty("defaultHotkey");
    for (const [name, callback] of [
      ["Open editor", h.open],
      ["Pause all CSS", h.pause],
      ["Unpause all CSS", h.unpause],
      ["Toggle all CSS", h.toggleAll],
    ] as const) {
      const command = h.commands.get(`Custom CSS Toggle: ${name}`)!;
      if (name !== "Pause all CSS") {
        expect(command).not.toHaveProperty("default-hotkey");
      }
      command.callback();
      expect(callback).toHaveBeenCalledOnce();
    }
    expect(h.commands.size).toBe(4);
  });

  it("keeps stored labels and callbacks through renames and distinguishes identical sheet names", async () => {
    const h = createHarness();
    const first = createSheet("first");
    const second = createSheet("second");
    const controller = await h.register([first, second]);
    await controller.sync([
      { ...first, name: "Renamed theme", enabled: true },
      second,
    ]);
    expect(h.addCommand).toHaveBeenCalledTimes(6);
    expect(h.removeCommand).not.toHaveBeenCalled();
    for (const sheet of [first, second]) {
      const command = h.commands.get(sheet.shortcut!.label)!;
      expect(command).not.toHaveProperty("default-hotkey");
      command.callback();
      expect(h.toggleSheet).toHaveBeenLastCalledWith(sheet.id);
    }
  });

  it("adds only opted-in sheets and removes deleted or disabled shortcuts", async () => {
    const h = createHarness();
    const first = createSheet("first");
    const second = createSheet("second");
    const controller = await h.register([first]);
    const staleCallback = h.commands.get(first.shortcut!.label)!.callback;
    await controller.sync([
      { ...first, shortcut: { ...first.shortcut!, enabled: false } },
      second,
      { id: "no-shortcut", name: "No shortcut", css: "", enabled: true },
    ]);
    staleCallback();
    expect(h.toggleSheet).not.toHaveBeenCalled();
    expect(h.commands.has(first.shortcut!.label)).toBe(false);
    expect(h.commands.has(second.shortcut!.label)).toBe(true);
    await controller.sync([]);
    expect(
      h.removeCommand.mock.calls.map(([command]) => command.label),
    ).toEqual([first.shortcut!.label, second.shortcut!.label]);
    expect(h.commands.size).toBe(4);
  });

  it("serializes a pending add before a later deletion", async () => {
    const h = createHarness();
    const controller = await h.register();
    const sheet = createSheet("pending");
    const started = deferred();
    const finish = deferred();
    h.addCommand.mockImplementationOnce(async (command) => {
      started.resolve();
      await finish.promise;
      h.commands.set(command.label, command);
    });
    const adding = controller.sync([sheet]);
    await started.promise;
    const deleting = controller.sync([]);
    expect(h.removeCommand).not.toHaveBeenCalled();
    finish.resolve();
    await Promise.all([adding, deleting]);
    expect(h.commands.has(sheet.shortcut!.label)).toBe(false);
    expect(h.commands.size).toBe(4);
  });

  it("serializes a pending removal before re-enabling the same stored label", async () => {
    const h = createHarness();
    const sheet = createSheet("pending");
    const controller = await h.register([sheet]);
    const started = deferred();
    const finish = deferred();
    h.removeCommand.mockImplementationOnce(async ({ label }) => {
      started.resolve();
      await finish.promise;
      h.commands.delete(label);
    });
    const disabling = controller.sync([]);
    await started.promise;
    const enabling = controller.sync([sheet]);
    expect(h.addCommand).toHaveBeenCalledTimes(5);
    finish.resolve();
    await Promise.all([disabling, enabling]);
    expect(h.commands.has(sheet.shortcut!.label)).toBe(true);
    expect(h.addCommand).toHaveBeenCalledTimes(6);
  });

  it("cleans a late add on disposal and skips queued syncs without allowing stale callbacks", async () => {
    const h = createHarness();
    const controller = await h.register();
    const first = createSheet("first");
    const second = createSheet("second");
    const started = deferred();
    const finish = deferred();
    h.addCommand.mockImplementationOnce(async (command) => {
      started.resolve();
      await finish.promise;
      h.commands.set(command.label, command);
    });
    const adding = controller.sync([first]);
    await started.promise;
    const queued = controller.sync([first, second]);
    const disposing = controller.dispose();
    h.commands.get("Custom CSS Toggle: Open editor")!.callback();
    expect(h.open).not.toHaveBeenCalled();
    finish.resolve();
    await Promise.all([adding, queued, disposing]);
    for (const [command] of h.addCommand.mock.calls) command.callback();
    expect(h.toggleSheet).not.toHaveBeenCalled();
    expect(h.commands.size).toBe(0);
    expect(h.addCommand).toHaveBeenCalledTimes(5);
    await controller.sync([first, second]);
    await controller.dispose();
    expect(h.addCommand).toHaveBeenCalledTimes(5);
    expect(h.removeCommand).toHaveBeenCalledTimes(5);
  });

  it("rejects an uncertain add while allowing a later sync to clean and retry it", async () => {
    const h = createHarness();
    const controller = await h.register();
    const sheet = createSheet("retry");
    h.addCommand.mockImplementationOnce(async (command) => {
      h.commands.set(command.label, command);
      throw new Error("add failed");
    });
    await expect(controller.sync([sheet])).rejects.toThrow("add failed");
    await controller.sync([sheet]);
    expect(h.removeCommand).toHaveBeenCalledExactlyOnceWith({
      label: sheet.shortcut!.label,
    });
    h.commands.get(sheet.shortcut!.label)!.callback();
    expect(h.toggleSheet).toHaveBeenCalledExactlyOnceWith(sheet.id);
    expect(h.commands.size).toBe(5);
  });

  it("retries failed removals without re-registering unchanged commands", async () => {
    const h = createHarness();
    const sheet = createSheet("retry");
    const controller = await h.register([sheet]);
    h.removeCommand.mockRejectedValueOnce(new Error("remove failed"));
    await expect(controller.sync([])).rejects.toThrow("remove failed");
    await controller.sync([]);
    expect(h.removeCommand).toHaveBeenCalledTimes(2);
    expect(h.addCommand).toHaveBeenCalledTimes(5);
    expect(h.commands.size).toBe(4);
  });

  it("continues disposal after a removal failure and permits retrying remaining cleanup", async () => {
    const h = createHarness();
    const controller = await h.register([createSheet("cleanup")]);
    h.removeCommand.mockRejectedValueOnce(new Error("remove failed"));
    await expect(controller.dispose()).rejects.toThrow("remove failed");
    expect(h.removeCommand).toHaveBeenCalledTimes(5);
    expect(h.commands.size).toBe(1);
    await controller.dispose();
    expect(h.commands.size).toBe(0);
  });

  it("cleans attempted registrations when initial registration fails", async () => {
    const h = createHarness();
    h.addCommand.mockImplementationOnce(async (command) => {
      h.commands.set(command.label, command);
      throw new Error("initial add failed");
    });
    await expect(h.register()).rejects.toThrow("initial add failed");
    expect(h.commands.size).toBe(0);
    expect(h.removeCommand).toHaveBeenCalledExactlyOnceWith({
      label: "Custom CSS Toggle: Open editor",
    });
  });

  it("rejects duplicate or global labels before changing native registrations", async () => {
    const h = createHarness();
    const controller = await h.register();
    const first = createSheet("first");
    const second = { ...createSheet("second"), shortcut: first.shortcut };
    await expect(controller.sync([first, second])).rejects.toThrow("unique");
    await expect(
      controller.sync([
        {
          ...first,
          shortcut: {
            enabled: true,
            label: "Custom CSS Toggle: Pause all CSS",
          },
        },
      ]),
    ).rejects.toThrow("unique");
    expect(h.addCommand).toHaveBeenCalledTimes(4);
    expect(h.removeCommand).not.toHaveBeenCalled();
  });
});
