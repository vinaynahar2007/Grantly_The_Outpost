import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AppRoutes } from "@/App";
import { createDemoScholarships, DEFAULT_SCHOLAR_PROFILE } from "@/data/scholarships";
import { calculateEligibility, buildEligibilityMap } from "@/utils/eligibility";
import {
  EMPTY_EXPLORER_FILTERS,
  applyExplorerQuery,
  buildActiveFilterChips,
  filterScholarships,
  removeFilterChip,
  searchScholarships,
  sortScholarships,
} from "@/utils/explorerLogic";
import { evaluateDeadline } from "@/utils/dashboardLogic";
import type { ExplorerFilters } from "@/types";

const baseDate = new Date(2026, 4, 15, 10, 0, 0);

function filters(partial: Partial<ExplorerFilters>): ExplorerFilters {
  return { ...EMPTY_EXPLORER_FILTERS, ...partial };
}

describe("GRANTLY Phase 3 — Scholarship Explorer", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  describe("Centralized dataset", () => {
    it("provides at least 12 fully-typed demonstration scholarship records", () => {
      const scholarships = createDemoScholarships(baseDate);
      expect(scholarships.length).toBeGreaterThanOrEqual(12);

      for (const scholarship of scholarships) {
        expect(scholarship.isDemo).toBe(true);
        expect(scholarship.officialUrl).toBeNull();
        expect(scholarship.title.length).toBeGreaterThan(3);
        expect(scholarship.provider.length).toBeGreaterThan(3);
        expect(scholarship.description.length).toBeGreaterThan(20);
        expect(scholarship.amount).toBe(scholarship.amountMax);
        expect(scholarship.educationLevels.length).toBeGreaterThan(0);
        expect(scholarship.benefits.length).toBeGreaterThan(0);
        expect(scholarship.applicationSteps.length).toBeGreaterThan(0);
        expect(scholarship.requiredDocuments.length).toBeGreaterThan(0);
        expect(scholarship.dateAdded).toBeTruthy();
      }

      const levels = new Set(scholarships.flatMap((s) => s.educationLevels));
      expect(levels).toEqual(
        new Set(["Undergraduate", "Postgraduate", "Doctoral", "Diploma", "School"])
      );
      const categories = new Set(scholarships.map((s) => s.category));
      expect(categories).toEqual(
        new Set(["Merit-Based", "Need-Based", "Government", "Private", "International", "Research"])
      );
      const locations = new Set(scholarships.map((s) => s.location));
      expect(locations).toEqual(new Set(["National", "State", "International"]));
    });
  });

  describe("Search, filtering and sorting utilities", () => {
    it("searches across name, provider, category and keywords", () => {
      const scholarships = createDemoScholarships(baseDate);
      expect(searchScholarships(scholarships, "Aarohan").map((s) => s.id)).toEqual([
        "demo-sch-01",
      ]);
      expect(searchScholarships(scholarships, "Navodaya Academic").map((s) => s.id)).toEqual([
        "demo-sch-02",
      ]);
      expect(searchScholarships(scholarships, "Government").map((s) => s.id)).toContain(
        "demo-sch-09"
      );
      expect(searchScholarships(scholarships, "doctoral").map((s) => s.id)).toContain(
        "demo-sch-10"
      );
      expect(searchScholarships(scholarships, "zzzz-no-match")).toHaveLength(0);
    });

    it("combines multiple filters with AND logic and builds removable chips", () => {
      const scholarships = createDemoScholarships(baseDate);
      const eligibilityById = buildEligibilityMap(DEFAULT_SCHOLAR_PROFILE, scholarships);

      const combined = filterScholarships(
        scholarships,
        filters({ educationLevels: ["Undergraduate"], categories: ["Merit-Based"] }),
        eligibilityById,
        baseDate
      );
      expect(combined.map((s) => s.id).sort()).toEqual(["demo-sch-01", "demo-sch-06"]);

      const highValue = filterScholarships(
        scholarships,
        filters({ amountRanges: ["above-500000"] }),
        eligibilityById,
        baseDate
      );
      expect(highValue.map((s) => s.id).sort()).toEqual(["demo-sch-09", "demo-sch-10"]);

      const within7 = filterScholarships(
        scholarships,
        filters({ deadline: "7" }),
        eligibilityById,
        baseDate
      );
      expect(within7.map((s) => s.id)).toEqual(["demo-sch-01"]);

      const eligibleOnly = filterScholarships(
        scholarships,
        filters({ eligibility: "eligible" }),
        eligibilityById,
        baseDate
      );
      expect(eligibleOnly.map((s) => s.id).sort()).toEqual([
        "demo-sch-03",
        "demo-sch-05",
        "demo-sch-06",
        "demo-sch-07",
        "demo-sch-08",
      ]);

      const chips = buildActiveFilterChips(
        filters({ educationLevels: ["Undergraduate"], categories: ["Merit-Based"] })
      );
      expect(chips.map((c) => c.label)).toEqual(["Undergraduate", "Merit-Based"]);
      const afterRemoval = removeFilterChip(
        filters({ educationLevels: ["Undergraduate"], categories: ["Merit-Based"] }),
        chips[0]
      );
      expect(afterRemoval.educationLevels).toEqual([]);
      expect(afterRemoval.categories).toEqual(["Merit-Based"]);
    });

    it("sorts by deadline, award amount and recency in the correct order", () => {
      const scholarships = createDemoScholarships(baseDate);
      const eligibilityById = buildEligibilityMap(DEFAULT_SCHOLAR_PROFILE, scholarships);

      const byDeadline = sortScholarships(scholarships, "deadline-asc", eligibilityById, baseDate);
      expect(byDeadline[0].id).toBe("demo-sch-01");
      expect(byDeadline[byDeadline.length - 1].id).toBe("demo-sch-08"); // closed goes last

      const byAmountDesc = sortScholarships(scholarships, "amount-desc", eligibilityById, baseDate);
      expect(byAmountDesc[0].id).toBe("demo-sch-10");
      expect(byAmountDesc[0].amount).toBe(1250000);

      const byAmountAsc = sortScholarships(scholarships, "amount-asc", eligibilityById, baseDate);
      expect(byAmountAsc[0].id).toBe("demo-sch-11");
      expect(byAmountAsc[0].amount).toBe(20000);

      const byRecent = sortScholarships(scholarships, "recent", eligibilityById, baseDate);
      expect(byRecent[0].id).toBe("demo-sch-09");

      const recommended = applyExplorerQuery(
        scholarships,
        "",
        EMPTY_EXPLORER_FILTERS,
        "recommended",
        eligibilityById,
        baseDate
      );
      expect(recommended[0].id).toBe("demo-sch-03"); // highest eligibility + match among Eligible
    });
  });

  describe("Eligibility preparation utility", () => {
    it("distinguishes Eligible, Potential Match and Not Eligible honestly", () => {
      const scholarships = createDemoScholarships(baseDate);
      const byId = (id: string) => scholarships.find((s) => s.id === id)!;

      const eligible = calculateEligibility(DEFAULT_SCHOLAR_PROFILE, byId("demo-sch-03"));
      expect(eligible.status).toBe("Eligible");
      expect(eligible.percentage).toBeGreaterThanOrEqual(90);
      expect(eligible.missingProfileInfo).toEqual([]);

      const potential = calculateEligibility(DEFAULT_SCHOLAR_PROFILE, byId("demo-sch-01"));
      expect(potential.status).toBe("Potential Match");
      expect(potential.missingProfileInfo).toContain("Leadership & research summary");

      const notEligible = calculateEligibility(DEFAULT_SCHOLAR_PROFILE, byId("demo-sch-09"));
      expect(notEligible.status).toBe("Not Eligible");
      expect(notEligible.failedCriteria.join(" ")).toMatch(/Postgraduate/i);
    });

    it("never claims eligibility when mandatory profile information is missing", () => {
      const scholarships = createDemoScholarships(baseDate);
      const aarohan = scholarships.find((s) => s.id === "demo-sch-01")!;

      const incomplete = calculateEligibility(
        { ...DEFAULT_SCHOLAR_PROFILE, gpa: "", leadershipSummary: "" },
        aarohan
      );
      expect(incomplete.status).not.toBe("Eligible");
      expect(incomplete.missingProfileInfo).toContain("GPA / academic standing");
      expect(incomplete.missingProfileInfo).toContain("Leadership & research summary");

      // GPA below a stated minimum is a hard failure.
      const lowGpa = calculateEligibility(
        { ...DEFAULT_SCHOLAR_PROFILE, gpa: "6.5 / 10.0 CGPA" },
        aarohan
      );
      expect(lowGpa.status).toBe("Not Eligible");
    });

    it("keeps deadline calculations dynamic (urgent within 7 days, closed when expired)", () => {
      expect(evaluateDeadline(createDemoScholarships(baseDate)[0].deadline, baseDate).urgency).toBe(
        "urgent"
      );
      const closed = createDemoScholarships(baseDate).find((s) => s.id === "demo-sch-08")!;
      expect(evaluateDeadline(closed.deadline, baseDate).urgency).toBe("closed");
    });
  });

  describe("Explorer UI interactions", () => {
    it("renders the explorer, searches live, filters, sorts and resets", async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter initialEntries={["/explore"]}>
          <AppRoutes />
        </MemoryRouter>
      );

      expect(
        await screen.findByRole("heading", { level: 1, name: /Explore Scholarships/i })
      ).toBeInTheDocument();
      expect(screen.getByText(/12 scholarships available in the demonstration dataset/i)).toBeInTheDocument();
      expect(await screen.findByText(/Horizon Computing & AI Innovators Award/i)).toBeInTheDocument();
      expect(screen.getByText(/Showing/i)).toHaveTextContent("12");

      // Live search
      const searchInput = screen.getByLabelText(/Search scholarships/i);
      await user.type(searchInput, "doctoral");
      expect(screen.getByText(/Global Doctoral Research Fellowship/i)).toBeInTheDocument();
      expect(screen.queryByText(/Aarohan STEM Excellence Fellowship/i)).not.toBeInTheDocument();

      // Clear search button
      await user.click(screen.getByRole("button", { name: /Clear search/i }));
      expect(await screen.findByText(/Aarohan STEM Excellence Fellowship/i)).toBeInTheDocument();

      // Combined filters (AND)
      await user.click(screen.getByLabelText("Postgraduate"));
      await user.click(screen.getByLabelText("Government"));
      expect(screen.getByText(/Bharat Postgraduate Merit Scholarship/i)).toBeInTheDocument();
      expect(screen.queryByText(/Global Doctoral Research Fellowship/i)).not.toBeInTheDocument();
      expect(screen.getByText(/Showing/i)).toHaveTextContent("1");

      // Removable chip
      await user.click(screen.getByRole("button", { name: /Remove filter Government/i }));
      expect(await screen.findByText(/Kiran Global Exchange & Conference Stipend/i)).toBeInTheDocument();

      // Reset all filters
      const filterPanel = screen.getByRole("complementary", { name: /Scholarship filters/i });
      await user.click(within(filterPanel).getByRole("button", { name: /Reset All/i }));
      expect(screen.getByText(/Showing/i)).toHaveTextContent("12");

      // Sorting actually changes order (highest award first)
      await user.selectOptions(screen.getByLabelText(/Sort by/i), "amount-desc");
      const headings = screen
        .getAllByRole("heading", { level: 3 })
        .map((heading) => heading.textContent);
      expect(headings[0]).toMatch(/Global Doctoral Research Fellowship/i);
    });

    it("shows a polished empty state for no search results and clears it", async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter initialEntries={["/explore"]}>
          <AppRoutes />
        </MemoryRouter>
      );

      expect(await screen.findByText(/Horizon Computing/i)).toBeInTheDocument();
      await user.type(screen.getByLabelText(/Search scholarships/i), "zzzz-nothing");
      expect(screen.getByText(/No Search Results Found/i)).toBeInTheDocument();

      const clearButtons = screen.getAllByRole("button", { name: /^Clear Filters$/i });
      await user.click(clearButtons[clearButtons.length - 1]);
      expect(await screen.findByText(/Aarohan STEM Excellence Fellowship/i)).toBeInTheDocument();
    });

    it("supports comparison up to three, comparison view and removal", async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter initialEntries={["/explore"]}>
          <AppRoutes />
        </MemoryRouter>
      );

      expect(await screen.findByText(/Horizon Computing/i)).toBeInTheDocument();

      // Empty comparison state
      await user.click(screen.getByRole("button", { name: /Compare \(0\)/i }));
      expect(screen.getByText(/No Comparison Selections/i)).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: /Explore Scholarships/i }));
      expect(screen.queryByText(/No Comparison Selections/i)).not.toBeInTheDocument();

      await user.click(
        screen.getByRole("button", { name: /Add Horizon Computing & AI Innovators Award to comparison/i })
      );
      await user.click(
        screen.getByRole("button", { name: /Add Vidyut Clean Energy & Sustainability Grant to comparison/i })
      );
      await user.click(
        screen.getByRole("button", { name: /Add Sankalp Academic Merit Bursary to comparison/i })
      );
      expect(screen.getByText(/Compare \(3\/3\)/i)).toBeInTheDocument();

      // Fourth selection is rejected with feedback
      await user.click(
        screen.getByRole("button", { name: /Add Kiran Global Exchange & Conference Stipend to comparison/i })
      );
      expect(screen.getByText(/Compare Limit Reached/i)).toBeInTheDocument();
      expect(screen.getByText(/Compare \(3\/3\)/i)).toBeInTheDocument();

      // Comparison view shows the required criteria rows
      await user.click(screen.getByRole("button", { name: /Compare Now/i }));
      const dialog = screen.getByRole("dialog", { name: /Compare scholarships/i });
      expect(within(dialog).getAllByText("Award amount").length).toBeGreaterThan(0);
      expect(within(dialog).getAllByText("Education level").length).toBeGreaterThan(0);
      expect(within(dialog).getAllByText("Required documents").length).toBeGreaterThan(0);
      expect(within(dialog).getAllByText("Scholarship category").length).toBeGreaterThan(0);

      // Removal inside the comparison view
      const removeButtons = within(dialog).getAllByRole("button", { name: /^Remove$/i });
      await user.click(removeButtons[0]);
      expect(
        within(dialog).queryAllByText(/Horizon Computing & AI Innovators Award/i)
      ).toHaveLength(0);
      await user.click(within(dialog).getByRole("button", { name: /Close comparison/i }));
    });

    it("persists bookmarks from Explorer into Saved and localStorage", async () => {
      const user = userEvent.setup();
      const { unmount } = render(
        <MemoryRouter initialEntries={["/explore"]}>
          <AppRoutes />
        </MemoryRouter>
      );

      expect(await screen.findByText(/Navodaya National Scholars Grant/i)).toBeInTheDocument();
      await user.click(
        screen.getByRole("button", { name: /Save Navodaya National Scholars Grant/i })
      );
      expect(screen.getByText("Scholarship Saved")).toBeInTheDocument();
      expect(window.localStorage.getItem("grantly_v1_saved_scholarships")).toContain(
        "demo-sch-02"
      );

      unmount();
      render(
        <MemoryRouter initialEntries={["/saved"]}>
          <AppRoutes />
        </MemoryRouter>
      );
      expect(screen.getByText(/Navodaya National Scholars Grant/i)).toBeInTheDocument();
    });

    it("navigates to scholarship details, shows unavailable official link and adds to tracker", async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter initialEntries={["/explore"]}>
          <AppRoutes />
        </MemoryRouter>
      );

      expect(await screen.findByText(/Horizon Computing/i)).toBeInTheDocument();
      const detailLinks = screen.getAllByRole("link", { name: /View Details/i });
      await user.click(detailLinks[0]);

      expect(
        screen.getByRole("heading", {
          level: 1,
          name: /Horizon Computing & AI Innovators Award/i,
        })
      ).toBeInTheDocument();
      expect(screen.getByText(/Scholarship Overview/i)).toBeInTheDocument();
      expect(screen.getByText(/About the Provider/i)).toBeInTheDocument();
      for (const section of [
        "Academic Requirements",
        "Financial Requirements",
        "Required Documents",
        "Benefits",
        "Application Procedure",
        "Important Dates",
      ]) {
        expect(screen.getByRole("heading", { name: new RegExp(section, "i") })).toBeInTheDocument();
      }
      expect(screen.getByText(/Official link unavailable/i)).toBeInTheDocument();

      // Horizon is already tracked in the demo pipeline, so the tracker CTA reflects that.
      expect(
        screen.getAllByRole("link", { name: /View in Application Tracker|Tracked/i }).length
      ).toBeGreaterThan(0);

      // Back to Explorer works
      await user.click(screen.getByRole("link", { name: /Back to Explorer/i }));
      expect(
        screen.getByRole("heading", { level: 1, name: /Explore Scholarships/i })
      ).toBeInTheDocument();
    });

    it("adds an untracked scholarship to the application tracker from details", async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter initialEntries={["/scholarships/demo-sch-07"]}>
          <AppRoutes />
        </MemoryRouter>
      );

      expect(
        await screen.findByRole("heading", {
          level: 1,
          name: /Kiran Global Exchange & Conference Stipend/i,
        })
      ).toBeInTheDocument();

      await user.click(
        screen.getAllByRole("button", { name: /Add to Application Tracker/i })[0]
      );
      expect(screen.getByText("Application Tracked")).toBeInTheDocument();
      expect(
        screen.getAllByRole("link", { name: /View in Application Tracker|Tracked/i }).length
      ).toBeGreaterThan(0);
    });

    it("handles an invalid scholarship route parameter safely", async () => {
      render(
        <MemoryRouter initialEntries={["/scholarships/not-a-real-id"]}>
          <AppRoutes />
        </MemoryRouter>
      );
      expect(await screen.findByText(/Scholarship Record Not Found/i)).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /Back to Explorer/i })).toBeInTheDocument();
    });
  });
});
