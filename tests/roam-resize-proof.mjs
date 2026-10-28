// Run with the RoamJS loader in an isolated, authenticated test slot.
export default {
  runtimeNames: ["custom-css-toggle"],
  settingsTab: "Custom CSS Toggle",
  async run({ page }) {
    const name = `Resize pause proof ${Date.now()}`;
    const drawer = page.locator(".cct-drawer");
    if (!(await drawer.count())) {
      await page.keyboard.press(
        process.platform === "darwin" ? "Meta+p" : "Control+p",
      );
      await page
        .getByPlaceholder("Search Commands")
        .fill("Custom CSS Toggle: Open editor");
      await page
        .getByText("Custom CSS Toggle: Open editor", { exact: true })
        .click();
    }
    const wasPaused =
      (await page
        .getByRole("button", { name: "Resume CSS", exact: true })
        .count()) > 0;
    if (wasPaused)
      await page
        .getByRole("button", { name: "Resume CSS", exact: true })
        .click();
    const previousDock = await page.getByLabel("Editor position").inputValue();
    const previousName = await page
      .getByRole("textbox", { name: "Stylesheet name" })
      .inputValue()
      .catch(() => "");
    await page
      .getByRole("button", { name: "New stylesheet", exact: true })
      .click();
    try {
      await page.getByRole("textbox", { name: "Stylesheet name" }).fill(name);
      await page.getByRole("tab", { name: "CSS source", exact: true }).click();
      await page
        .getByRole("textbox", { name: "CSS source" })
        .fill("body { --cct-resize-proof: 1; }");
      await page.getByRole("button", { name: "Save", exact: true }).click();
      await page.getByLabel("Editor position").selectOption("right");
      await page.waitForFunction(() =>
        document
          .querySelector("[data-cct-styles]")
          ?.textContent.includes("--cct-resize-proof"),
      );
      const handle = await page
        .getByRole("separator", { name: "Resize CSS editor" })
        .boundingBox();
      if (!handle) throw new Error("Resize handle is missing");
      await page.mouse.move(handle.x + 3, handle.y + handle.height / 2);
      await page.mouse.down();
      await page.mouse.move(handle.x - 40, handle.y + handle.height / 2, {
        steps: 4,
      });
      await page.keyboard.press("Control+Alt+Shift+KeyC");
      await page
        .getByRole("button", { name: "Resume CSS", exact: true })
        .waitFor();
      await page.mouse.move(handle.x - 80, handle.y + handle.height / 2, {
        steps: 4,
      });
      await page.mouse.up();
      const styles = await page.locator("[data-cct-styles] style").count();
      if (styles !== 0)
        throw new Error(
          "Releasing an active resize restored CSS after emergency pause",
        );
      await page
        .getByRole("button", { name: "Resume CSS", exact: true })
        .waitFor();
      return { emergencyDuringResize: "passed", stylesAfterRelease: styles };
    } finally {
      await page.mouse.up();
      if (
        await page
          .getByRole("button", { name: "Resume CSS", exact: true })
          .count()
      ) {
        await page
          .getByRole("button", { name: "Resume CSS", exact: true })
          .click();
      }
      await page
        .getByRole("button", { name: "Delete stylesheet", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Discard / continue", exact: true })
        .click();
      await page.getByLabel("Editor position").selectOption(previousDock);
      if (previousName)
        await page
          .getByRole("button", { name: previousName, exact: true })
          .click();
      if (wasPaused)
        await page
          .getByRole("button", { name: "Pause all", exact: true })
          .click();
    }
  },
};
