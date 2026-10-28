// Run with the RoamJS loader in an isolated, authenticated test slot.
export default {
  runtimeNames: ["custom-css-toggle"],
  settingsTab: "Custom CSS Toggle",
  async run({ page }) {
    const token = Date.now();
    const primary = `Import race proof ${token}`;
    const imports = ["A", "B", "C"].map(
      (letter) => `Import ${letter} ${token}`,
    );
    if (!(await page.locator(".cct-drawer").count())) {
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
    const originalName = await page
      .getByRole("textbox", { name: "Stylesheet name" })
      .inputValue()
      .catch(() => "");
    await page
      .getByRole("button", { name: "New stylesheet", exact: true })
      .click();
    try {
      await page
        .getByRole("textbox", { name: "Stylesheet name" })
        .fill(primary);
      await page.getByRole("tab", { name: "CSS source", exact: true }).click();
      await page
        .getByRole("textbox", { name: "CSS source" })
        .fill(".import-race { --proof: 1; }");
      await page.getByRole("button", { name: "Save", exact: true }).click();
      await page.evaluate(() => {
        window.__cctOriginalImportText = File.prototype.text;
        window.__cctImportReads = {};
        File.prototype.text = function () {
          const file = this;
          return new Promise((resolve) => {
            window.__cctImportReads[file.name] = async () =>
              resolve(await window.__cctOriginalImportText.call(file));
          });
        };
      });
      const startImport = async (name) => {
        await page
          .locator('input[type="file"]')
          .setInputFiles({
            name: `${name}.css`,
            mimeType: "text/css",
            buffer: Buffer.from(".imported { --import-proof: 1; }"),
          });
        await page.waitForFunction(
          (filename) => typeof window.__cctImportReads[filename] === "function",
          `${name}.css`,
        );
      };
      const finishImport = async (name) => {
        await page.evaluate(async (filename) => {
          await window.__cctImportReads[filename]();
          await new Promise(requestAnimationFrame);
          await new Promise(requestAnimationFrame);
        }, `${name}.css`);
        await page.getByRole("button", { name, exact: true }).waitFor();
      };
      await startImport(imports[0]);
      await page
        .getByRole("textbox", { name: "CSS source" })
        .fill(".import-race { --proof: 2; }");
      await page.getByRole("button", { name: "Save", exact: true }).click();
      const enabled = page.locator(`input[aria-label="Enable ${primary}"]`);
      await enabled.locator("..").click();
      await startImport(imports[1]);
      await finishImport(imports[0]);
      await finishImport(imports[1]);
      for (const name of imports.slice(0, 2)) {
        if (!(await page.getByRole("button", { name, exact: true }).count()))
          throw new Error(
            "An overlapping import discarded an earlier imported file",
          );
      }
      await page.getByRole("button", { name: primary, exact: true }).click();
      if (!(await enabled.isChecked()))
        throw new Error("A late import overwrote an intervening toggle");
      await page.getByRole("tab", { name: "CSS source", exact: true }).click();
      if (
        !(
          await page.getByRole("textbox", { name: "CSS source" }).innerText()
        ).includes("--proof: 2")
      )
        throw new Error("A late import overwrote saved CSS edits");
      await startImport(imports[2]);
      await page
        .getByRole("textbox", { name: "CSS source" })
        .fill(".import-race { --proof: 3; }");
      await finishImport(imports[2]);
      if (
        (await page
          .getByRole("textbox", { name: "Stylesheet name" })
          .inputValue()) !== primary ||
        !(
          await page.getByRole("textbox", { name: "CSS source" }).innerText()
        ).includes("--proof: 3")
      )
        throw new Error("A late import discarded the current unsaved draft");
      await page.getByRole("button", { name: "Revert", exact: true }).click();
      return {
        overlappingImports: "passed",
        savedEditsDuringImport: "passed",
        togglesDuringImport: "passed",
        unsavedDraftDuringImport: "passed",
      };
    } finally {
      await page.evaluate(() => {
        if (window.__cctOriginalImportText)
          File.prototype.text = window.__cctOriginalImportText;
        delete window.__cctOriginalImportText;
        delete window.__cctImportReads;
      });
      const revert = page.getByRole("button", { name: "Revert", exact: true });
      if ((await revert.count()) && (await revert.isEnabled()))
        await revert.click();
      for (const name of [...imports].reverse().concat(primary)) {
        const owned = page.getByRole("button", { name, exact: true });
        if (!(await owned.count())) continue;
        await owned.click();
        await page
          .getByRole("button", { name: "Delete stylesheet", exact: true })
          .click();
        await page
          .getByRole("button", { name: "Discard / continue", exact: true })
          .click();
      }
      if (originalName)
        await page
          .getByRole("button", { name: originalName, exact: true })
          .click();
    }
  },
};
