/* Run against Vite using isolated Playwright tooling or local dev tooling. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { chromium } = require("playwright");
const AxeBuilder = require("@axe-core/playwright").default;

const base = process.env.APP_URL || "http://localhost:5173";
const output = "artifacts/phase5";
const reports = [];
const errors = [];

async function noOverflow(page, label) {
  const dimensions = await page.evaluate(() => ({
    viewport: innerWidth,
    content: document.documentElement.scrollWidth,
  }));
  assert.ok(
    dimensions.content <= dimensions.viewport,
    `${label}: horizontal overflow ${JSON.stringify(dimensions)}`,
  );
}

async function scan(page, label) {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  reports.push({
    label,
    violations: result.violations.map((issue) => ({
      id: issue.id,
      impact: issue.impact,
      nodes: issue.nodes.map((node) => ({
        target: node.target,
        summary: node.failureSummary,
      })),
    })),
  });
}

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox"],
  });
  try {
    for (const [name, width, height] of [
      ["desktop", 1440, 1000],
      ["tablet", 834, 1112],
      ["mobile", 390, 844],
      ["small-mobile", 320, 740],
    ]) {
      const context = await browser.newContext({
        viewport: { width, height },
        reducedMotion: "reduce",
      });
      const page = await context.newPage();
      page.on("pageerror", (error) => errors.push(`${name}: ${error.message}`));
      page.on("console", (message) => {
        if (message.type() === "error")
          errors.push(`${name}: ${message.text()}`);
      });
      await page.goto(`${base}/applications`);
      await page
        .getByRole("heading", { name: "Applications", exact: true })
        .waitFor();
      await page.evaluate(() => document.fonts.ready);
      await noOverflow(page, `${name} list`);
      await scan(page, `${name} list`);
      await page.screenshot({
        path: `${output}/${name}-list.png`,
        fullPage: true,
      });
      await page
        .getByRole("button", { name: "Kanban view", exact: true })
        .click();
      await noOverflow(page, `${name} board`);
      await page
        .getByRole("region", { name: "Preparing column", exact: true })
        .waitFor();
      await scan(page, `${name} board`);
      await page.screenshot({
        path: `${output}/${name}-board.png`,
        fullPage: true,
      });
      await page
        .getByRole("button", { name: "List view", exact: true })
        .click();

      // Notes, actual dates and readiness survive a full reload.
      await page
        .getByRole("button", {
          name: "Edit Aarohan STEM Excellence Fellowship",
          exact: true,
        })
        .click();
      let dialog = page.getByRole("dialog", {
        name: "Application details",
        exact: true,
      });
      await dialog.locator("button").last().focus();
      await page.keyboard.press("Tab");
      assert.equal(
        await page.evaluate(
          () => !!document.activeElement.closest('[role="dialog"]'),
        ),
        true,
        "Keyboard focus must stay in the dialog",
      );
      await dialog
        .getByLabel("Personal notes", { exact: true })
        .fill("Browser verified: request a faculty recommendation.");
      await dialog
        .getByLabel("Submission date", { exact: true })
        .fill("2026-01-01");
      await dialog
        .getByLabel("Personal reminder date", { exact: true })
        .fill("2027-01-10");
      await dialog
        .getByLabel("Official Semester Transcripts", { exact: true })
        .check();
      await scan(page, `${name} details`);
      await noOverflow(page, `${name} details`);
      await page.screenshot({ path: `${output}/${name}-details.png` });
      await dialog
        .getByRole("button", { name: "Save changes", exact: true })
        .click();
      await dialog.waitFor({ state: "hidden" });
      await page.reload();
      await page
        .getByRole("button", {
          name: "View application Aarohan STEM Excellence Fellowship",
          exact: true,
        })
        .click();
      dialog = page.getByRole("dialog", {
        name: "Application details",
        exact: true,
      });
      assert.equal(
        await dialog.getByLabel("Personal notes", { exact: true }).inputValue(),
        "Browser verified: request a faculty recommendation.",
      );
      assert.equal(
        await dialog
          .getByLabel("Submission date", { exact: true })
          .inputValue(),
        "2026-01-01",
      );
      assert.equal(
        await dialog
          .getByLabel("Personal reminder date", { exact: true })
          .inputValue(),
        "2027-01-10",
      );
      assert.equal(
        await dialog
          .getByLabel("Official Semester Transcripts", { exact: true })
          .isChecked(),
        true,
      );
      await dialog.getByRole("button", { name: "Close", exact: true }).click();
      await dialog.waitFor({ state: "hidden" });

      // Add from Saved; duplicates are visibly disabled.
      await page
        .getByRole("button", { name: "Add application", exact: true })
        .click();
      dialog = page.getByRole("dialog", {
        name: "Add an application",
        exact: true,
      });
      await dialog
        .getByRole("radio", {
          name: "Pragati First-Generation Leaders Scholarship",
          exact: true,
        })
        .check();
      await scan(page, `${name} add`);
      await noOverflow(page, `${name} add`);
      await page.screenshot({ path: `${output}/${name}-add.png` });
      await dialog
        .getByRole("button", { name: "Add application", exact: true })
        .click();
      await dialog.waitFor({ state: "hidden" });
      await page
        .getByRole("button", { name: "Add application", exact: true })
        .click();
      dialog = page.getByRole("dialog", {
        name: "Add an application",
        exact: true,
      });
      assert.equal(
        await dialog
          .getByRole("radio", {
            name: "Pragati First-Generation Leaders Scholarship",
            exact: true,
          })
          .isDisabled(),
        true,
      );
      await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
      await dialog.waitFor({ state: "hidden" });

      // Status changes from Kanban, then archive and dashboard synchronization.
      await page
        .getByRole("button", { name: "Kanban view", exact: true })
        .click();
      await page
        .getByRole("combobox", {
          name: "Status for Pragati First-Generation Leaders Scholarship",
          exact: true,
        })
        .selectOption("shortlisted");
      assert.equal(
        await page
          .getByRole("region", { name: "Shortlisted column", exact: true })
          .getByText("Pragati First-Generation Leaders Scholarship", {
            exact: true,
          })
          .count(),
        1,
      );
      await page
        .getByRole("combobox", {
          name: "Status for Pragati First-Generation Leaders Scholarship",
          exact: true,
        })
        .selectOption("withdrawn");
      await page
        .getByRole("heading", { name: "Rejected & withdrawn (1)", exact: true })
        .waitFor();
      const stored = await page.evaluate(() =>
        JSON.parse(localStorage.getItem("grantly_v1_scholar_applications")),
      );
      assert.equal(
        stored
          .find((app) => app.scholarshipId === "demo-sch-04")
          .history.filter((event) => event.type === "status_changed").length,
        2,
      );
      await page
        .getByRole("button", { name: "List view", exact: true })
        .click();
      await page
        .getByRole("button", {
          name: "Delete Pragati First-Generation Leaders Scholarship",
          exact: true,
        })
        .click();
      dialog = page.getByRole("dialog", {
        name: "Delete application?",
        exact: true,
      });
      await dialog
        .getByRole("button", { name: "Delete application", exact: true })
        .click();
      await dialog.waitFor({ state: "hidden" });
      assert.equal(
        await page.evaluate(() =>
          JSON.parse(
            localStorage.getItem("grantly_v1_scholar_applications"),
          ).some((app) => app.scholarshipId === "demo-sch-04"),
        ),
        false,
      );
      await page.goto(`${base}/dashboard`);
      await page.getByText("04 active", { exact: true }).waitFor();
      await noOverflow(page, `${name} dashboard`);

      // Previous phases still render in a real browser.
      for (const path of [
        "explore",
        "saved",
        "eligibility",
        "profile",
        "documents",
        "calendar",
      ]) {
        await page.goto(`${base}/${path}`);
        await page.locator("main h1").waitFor();
      }
      reports.push({
        label: name,
        workflows:
          "list, board, focus containment, notes/dates/documents refresh, add, duplicate prevention, status history, withdrawal, confirmed deletion, dashboard synchronization, prior routes: passed",
      });
      await context.close();
    }
  } finally {
    await browser.close();
    fs.writeFileSync(
      `${output}/browser-report.json`,
      JSON.stringify({ reports, errors }, null, 2),
    );
  }
  const violations = reports.flatMap((report) => report.violations || []);
  console.log(
    JSON.stringify(
      {
        viewports: 4,
        accessibilityScans: reports.filter((report) => report.violations)
          .length,
        accessibilityViolations: violations.length,
        browserErrors: errors,
      },
      null,
      2,
    ),
  );
  assert.equal(errors.length, 0, "Browser errors recorded");
  assert.equal(violations.length, 0, "Accessibility issues recorded");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
