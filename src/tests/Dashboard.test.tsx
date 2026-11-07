import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AppRoutes } from "@/tests/testAppRoutes";
import {
  calculateProfileCompletion,
  computeDashboardMetrics,
  evaluateDeadline,
  formatINR,
  summarizeApplicationProgress,
} from "@/utils/dashboardLogic";
import {
  createDemoApplications,
  createDemoScholarships,
  DEFAULT_SCHOLAR_PROFILE,
} from "@/data/scholarships";

describe("GRANTLY Phase 2 — Student Dashboard", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  describe("Business Logic & Derived Calculations", () => {
    it("formats Indian currency accurately and derives key dashboard metrics from centralized data", () => {
      const baseDate = new Date(2026, 4, 15, 10, 0, 0);
      const scholarships = createDemoScholarships(baseDate);
      const applications = createDemoApplications(baseDate);

      expect(formatINR(850000)).toBe("₹8,50,000");

      const metrics = computeDashboardMetrics(
        scholarships,
        applications,
        baseDate,
      );
      expect(metrics.matchingCount).toBe(8);
      expect(metrics.potentialFundingTotal).toBe(850000);
      expect(metrics.activeApplicationsCount).toBe(4);
      expect(metrics.upcomingDeadlinesCount).toBe(3);

      const stageSummary = summarizeApplicationProgress(applications);
      expect(stageSummary.map((s) => s.status)).toEqual([
        "Saved",
        "Preparing",
        "Submitted",
        "Under Review",
        "Shortlisted",
        "Awarded",
        "Rejected",
        "Withdrawn",
      ]);
      expect(
        stageSummary.find((stage) => stage.status === "Preparing")?.count,
      ).toBe(2);
      expect(
        stageSummary.find((stage) => stage.status === "Submitted")?.count,
      ).toBe(1);
      expect(
        stageSummary.find((stage) => stage.status === "Under Review")?.count,
      ).toBe(1);
      expect(
        stageSummary.find((stage) => stage.status === "Awarded")?.count,
      ).toBe(1);
    });

    it("evaluates deadline countdowns and urgency tiers accurately", () => {
      const refDate = new Date(2026, 4, 15, 9, 0, 0);

      const urgent = evaluateDeadline(
        new Date(2026, 4, 19, 17, 0, 0).toISOString(),
        refDate,
      );
      expect(urgent.remainingDays).toBe(4);
      expect(urgent.urgency).toBe("urgent");
      expect(urgent.label).toBe("Urgent");

      const attention = evaluateDeadline(
        new Date(2026, 4, 26, 17, 0, 0).toISOString(),
        refDate,
      );
      expect(attention.remainingDays).toBe(11);
      expect(attention.urgency).toBe("attention");
      expect(attention.label).toBe("Attention");

      const normal = evaluateDeadline(
        new Date(2026, 5, 10, 17, 0, 0).toISOString(),
        refDate,
      );
      expect(normal.remainingDays).toBe(26);
      expect(normal.urgency).toBe("normal");
      expect(normal.label).toBe("Normal");

      const closed = evaluateDeadline(
        new Date(2026, 4, 12, 17, 0, 0).toISOString(),
        refDate,
      );
      expect(closed.remainingDays).toBe(-3);
      expect(closed.urgency).toBe("closed");
      expect(closed.label).toBe("Closed");
    });

    it("calculates profile completion percentage, completed sections, and missing hints from profile fields", () => {
      const partial = calculateProfileCompletion(DEFAULT_SCHOLAR_PROFILE);
      expect(partial.completedCount).toBe(4);
      expect(partial.totalCount).toBe(6);
      expect(partial.percentage).toBe(67);
      expect(partial.missingSections).toHaveLength(2);

      const complete = calculateProfileCompletion({
        ...DEFAULT_SCHOLAR_PROFILE,
        annualFamilyIncome: "Under ₹8,00,000 per annum",
        leadershipSummary:
          "Led open-source developer club and undergraduate AI systems lab.",
      });
      expect(complete.percentage).toBe(100);
      expect(complete.missingSections).toHaveLength(0);
    });
  });

  describe("Dashboard UI, Interactions & LocalStorage Persistence", () => {
    it("renders all required dashboard sections and demonstration data disclosures", async () => {
      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <AppRoutes />
        </MemoryRouter>,
      );

      // A. Welcome section
      expect(
        screen.getByRole("heading", { level: 1, name: /Good morning, Alex/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Here is your scholarship journey at a glance\./i),
      ).toBeInTheDocument();

      // B. Four key statistic cards
      expect(screen.getByText("08 matches")).toBeInTheDocument();
      expect(screen.getByText("₹8,50,000")).toBeInTheDocument();
      expect(
        screen.getByText(/Estimated potential funding · Not guaranteed/i),
      ).toBeInTheDocument();
      expect(screen.getByText("04 active")).toBeInTheDocument();
      expect(screen.getByText("03 deadlines")).toBeInTheDocument();

      // C. Recommended Scholarships + Demo disclosure
      expect(
        screen.getByRole("heading", { name: /Recommended Scholarships/i }),
      ).toBeInTheDocument();
      expect(screen.getByText(/Demonstration Data:/i)).toBeInTheDocument();
      expect(
        screen.getAllByText(/Aarohan STEM Excellence Fellowship/i).length,
      ).toBeGreaterThan(0);

      // D. Application Progress
      expect(
        await screen.findByRole("heading", { name: /Application Progress/i }),
      ).toBeInTheDocument();
      const stageList = screen.getByRole("list", {
        name: /Application stage counts/i,
      });
      expect(within(stageList).getByText("Preparing")).toBeInTheDocument();
      expect(within(stageList).getByText("Submitted")).toBeInTheDocument();
      expect(within(stageList).getByText("Under Review")).toBeInTheDocument();
      expect(within(stageList).getByText("Awarded")).toBeInTheDocument();

      // E. Upcoming Deadlines
      expect(
        screen.getByRole("heading", { name: /Upcoming Deadlines/i }),
      ).toBeInTheDocument();
      expect(screen.getByText("Urgent")).toBeInTheDocument();
      expect(screen.getByText("Attention")).toBeInTheDocument();

      // F. Recent Activity
      expect(
        screen.getByRole("heading", { name: /Recent Activity/i }),
      ).toBeInTheDocument();

      // G. Profile Completion
      expect(
        screen.getByRole("heading", { name: /Profile Completion/i }),
      ).toBeInTheDocument();
      expect(screen.getAllByText("67%").length).toBeGreaterThanOrEqual(2);
    });

    it("supports saving/unsaving scholarships with toast feedback and LocalStorage persistence", async () => {
      const user = userEvent.setup();

      const { unmount } = render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <AppRoutes />
        </MemoryRouter>,
      );

      // Navodaya National Scholars Grant is initially unsaved
      const saveButton = screen.getByRole("button", {
        name: /Save Navodaya National Scholars Grant/i,
      });
      expect(saveButton).toHaveAttribute("aria-pressed", "false");

      await user.click(saveButton);

      expect(
        screen.getByRole("button", {
          name: /Remove Navodaya National Scholars Grant from saved scholarships/i,
        }),
      ).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByText("Scholarship Saved")).toBeInTheDocument();

      // Verify persistence in LocalStorage across remount
      unmount();

      render(
        <MemoryRouter initialEntries={["/saved"]}>
          <AppRoutes />
        </MemoryRouter>,
      );

      expect(
        screen.getByText(/Navodaya National Scholars Grant/i),
      ).toBeInTheDocument();
    });

    it("navigates to scholarship details and supports profile updates recalculating completion", async () => {
      const user = userEvent.setup();

      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <AppRoutes />
        </MemoryRouter>,
      );

      // Navigate to Scholarship Details via View Details
      const detailLinks = screen.getAllByRole("link", {
        name: /View Details/i,
      });
      await user.click(detailLinks[0]);

      expect(
        screen.getByRole("heading", {
          level: 1,
          name: /Aarohan STEM Excellence Fellowship/i,
        }),
      ).toBeInTheDocument();

      // Return to dashboard and navigate to Complete Profile
      await user.click(
        screen.getByRole("link", { name: /Back to Dashboard/i }),
      );
      await user.click(screen.getByRole("link", { name: /Complete Profile/i }));

      expect(
        screen.getByRole("heading", { level: 1, name: /Scholar Profile/i }),
      ).toBeInTheDocument();

      // Fill missing profile fields and save
      const incomeInput = screen.getByLabelText(
        /Annual Household Income Bracket/i,
      );
      const leadershipInput = screen.getByLabelText(
        /Leadership, Research & Extracurricular Summary/i,
      );

      await user.type(incomeInput, "Under ₹8,00,000 per annum");
      await user.type(
        leadershipInput,
        "Built campus open-source tools and mentored first-year students.",
      );
      await user.click(screen.getByRole("button", { name: /Save Profile/i }));

      expect(screen.getByText("100%")).toBeInTheDocument();

      // Navigate back to Dashboard and verify 100% reflects there too
      await user.click(
        screen.getAllByRole("link", { name: /^Dashboard$/i })[0],
      );
      expect(screen.getByText(/Profile 100% Complete/i)).toBeInTheDocument();
    });

    it("handles malformed LocalStorage data gracefully without crashing", () => {
      window.localStorage.setItem(
        "grantly_v1_saved_scholarships",
        "{corrupted_json",
      );
      window.localStorage.setItem(
        "grantly_v1_scholar_profile",
        '"unexpected_string"',
      );
      window.localStorage.setItem("grantly_v1_scholar_applications", "12345");
      window.localStorage.setItem("grantly_v1_scholar_activities", "null");

      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <AppRoutes />
        </MemoryRouter>,
      );

      expect(
        screen.getByRole("heading", { level: 1, name: /Good morning, Alex/i }),
      ).toBeInTheDocument();
      expect(screen.getByText("08 matches")).toBeInTheDocument();
    });
  });
});
