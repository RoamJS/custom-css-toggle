// Run with the RoamJS loader in an isolated, authenticated test slot.
export default {
  runtimeNames: ["custom-css-toggle"],
  settingsTab: "Custom CSS Toggle",
  async run({ page }) {
    const permissionNotice = page.locator(".bp3-toast").filter({
      hasText:
        "developer extensions from your file system need permission to load",
    });
    if (await permissionNotice.count())
      await permissionNotice
        .getByRole("button", { name: "Close", exact: true })
        .click();
    const pauseShortcut =
      process.platform === "darwin"
        ? "Meta+Alt+Shift+KeyC"
        : "Control+Alt+Shift+KeyC";
    const name = `Resize pause proof ${Date.now()}`;
    const editor = page.getByRole("dialog", {
      name: "Custom CSS Toggle",
      exact: true,
    });
    if (!(await editor.count())) {
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
    const previousDock = await page
      .getByRole("group", { name: "Editor position", exact: true })
      .locator('[aria-pressed="true"]')
      .getAttribute("aria-label");
    if (!previousDock) throw new Error("Active editor position is missing");
    const previousName = await page
      .getByRole("textbox", { name: "Stylesheet name" })
      .inputValue()
      .catch(() => "");
    const previousIndex = await page
      .locator(".cct-sheet")
      .evaluateAll((rows) =>
        rows.findIndex((row) => row.classList.contains("cct-selected")),
      );
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
      await page
        .getByRole("button", { name: "Dock right", exact: true })
        .click();
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
      await page.keyboard.press(pauseShortcut);
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
      await page
        .getByRole("button", { name: "Resume CSS", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Delete stylesheet", exact: true })
        .click();
      await page.keyboard.press(pauseShortcut);
      await page
        .getByRole("button", { name: "Resume CSS", exact: true })
        .waitFor();
      const confirm = page.getByRole("button", {
        name: "Discard / continue",
        exact: true,
      });
      if (await confirm.count()) await confirm.click();
      if (
        (await page.locator("[data-cct-styles] style").count()) !== 0 ||
        !(await page
          .getByRole("button", { name: "Resume CSS", exact: true })
          .count())
      ) {
        throw new Error(
          "A pending confirmation restored CSS after emergency pause",
        );
      }
      if (!(await page.getByRole("button", { name, exact: true }).count()))
        throw new Error("Emergency pause did not cancel pending deletion");
      await page
        .getByRole("button", { name: "Resume CSS", exact: true })
        .click();
      await page.evaluate(() => {
        window.__cctOriginalFileText = File.prototype.text;
        File.prototype.text = function () {
          const file = this;
          return new Promise((resolve) => {
            window.__cctReleaseImport = async () =>
              resolve(await window.__cctOriginalFileText.call(file));
          });
        };
      });
      await page.locator('input[type="file"]').setInputFiles({
        name: "Late pause import.css",
        mimeType: "text/css",
        buffer: Buffer.from("body { --cct-late-import: 1; }"),
      });
      await page.waitForFunction(
        () => typeof window.__cctReleaseImport === "function",
      );
      await page.keyboard.press(pauseShortcut);
      await page.evaluate(async () => {
        await window.__cctReleaseImport();
        await new Promise(requestAnimationFrame);
        await new Promise(requestAnimationFrame);
      });
      if (
        (await page.locator("[data-cct-styles] style").count()) !== 0 ||
        !(await page
          .getByRole("button", { name: "Resume CSS", exact: true })
          .count())
      )
        throw new Error("A delayed import restored CSS after emergency pause");
      if (
        await page
          .getByRole("button", { name: "Late pause import", exact: true })
          .count()
      )
        throw new Error(
          "An import started before emergency pause was committed afterward",
        );
      return {
        emergencyDuringResize: "passed",
        emergencyDuringPendingDeletion: "passed",
        emergencyDuringDelayedImport: "passed",
        stylesAfterRelease: styles,
      };
    } catch (error) {
      console.error("Resize/pause regression failed:", error.message);
      throw error;
    } finally {
      await page.evaluate(() => {
        if (window.__cctOriginalFileText)
          File.prototype.text = window.__cctOriginalFileText;
        delete window.__cctOriginalFileText;
        delete window.__cctReleaseImport;
      });
      await page.mouse.up();
      const cancel = page.getByRole("button", { name: "Cancel", exact: true });
      if (await cancel.count()) await cancel.click();
      if (
        await page
          .getByRole("button", { name: "Resume CSS", exact: true })
          .count()
      ) {
        await page
          .getByRole("button", { name: "Resume CSS", exact: true })
          .click();
      }
      for (const ownedName of ["Late pause import", name]) {
        const owned = page.getByRole("button", {
          name: ownedName,
          exact: true,
        });
        if (!(await owned.count())) continue;
        await owned.click();
        await page
          .getByRole("button", { name: "Delete stylesheet", exact: true })
          .click();
        await page
          .getByRole("button", { name: "Discard / continue", exact: true })
          .click();
      }
      await page
        .getByRole("button", { name: previousDock, exact: true })
        .click();
      if (previousName)
        await page
          .locator(".cct-sheet")
          .nth(previousIndex)
          .getByRole("button", { name: previousName, exact: true })
          .click();
      if (wasPaused)
        await page
          .getByRole("button", { name: "Pause all", exact: true })
          .click();
    }
  },
};
