import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AppRoutes } from "@/tests/testAppRoutes";
import { Button, Card, CardHeader, CardTitle, CardContent } from "@/components/ui";

describe("GRANTLY Application Foundation", () => {
  it("renders the GRANTLY brand identity and tagline on the dashboard shell", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <AppRoutes />
      </MemoryRouter>
    );

    expect(screen.getAllByText("GRANTLY").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Your future deserves funding\./i).length).toBeGreaterThan(0);
    expect(
      screen.getByRole("heading", { level: 1, name: /Good morning, Alex/i })
    ).toBeInTheDocument();
  });

  it("navigates cleanly across all 7 primary routes via the sidebar", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <AppRoutes />
      </MemoryRouter>
    );

    const primaryNav = screen.getByRole("navigation", { name: /Primary Navigation/i });

    const routeChecks: Array<{ linkName: RegExp; headingName: RegExp }> = [
      { linkName: /^Explore$/i, headingName: /Explore Scholarships/i },
      { linkName: /^Saved$/i, headingName: /Saved Scholarships/i },
      { linkName: /^Applications$/i, headingName: /^Applications$/i },
      { linkName: /^Documents$/i, headingName: /Document Vault/i },
      { linkName: /^Calendar$/i, headingName: /Deadlines Calendar/i },
      { linkName: /^Profile$/i, headingName: /Scholar Profile/i },
      { linkName: /^Dashboard$/i, headingName: /Good morning, Alex/i },
    ];

    for (const check of routeChecks) {
      const link = Array.from(primaryNav.querySelectorAll("a")).find((anchor) =>
        check.linkName.test(anchor.textContent?.trim() ?? "")
      );
      expect(link).toBeDefined();
      await user.click(link!);
      expect(
        screen.getByRole("heading", { level: 1, name: check.headingName })
      ).toBeInTheDocument();
      expect(link).toHaveAttribute("aria-current", "page");
    }
  });

  it("opens the mobile drawer with focus and restores focus when dismissed with Escape", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <AppRoutes />
      </MemoryRouter>
    );

    const openButton = screen.getByRole("button", {
      name: "Open navigation menu",
    });
    await user.click(openButton);
    const drawer = screen.getByRole("dialog", { name: "Navigation Drawer" });
    expect(drawer).toBeInTheDocument();
    expect(document.activeElement).toHaveAttribute(
      "aria-label",
      "Close navigation menu",
    );
    expect(document.body.style.overflow).toBe("hidden");

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Navigation Drawer" })).not.toBeInTheDocument();
    expect(document.activeElement).toBe(openButton);
    expect(document.body.style.overflow).toBe("");
  });

  it("renders reusable Button and Card primitives with accessible interaction", async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(
      <Card>
        <CardHeader>
          <CardTitle>Sample Container</CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="primary" onClick={handleClick}>
            Continue Setup
          </Button>
        </CardContent>
      </Card>
    );

    expect(screen.getByText("Sample Container")).toBeInTheDocument();
    const button = screen.getByRole("button", { name: /Continue Setup/i });
    await user.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
