import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, waitForElementToBeRemoved, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AppRoutes } from "@/App";
import { createDemoScholarships, DEFAULT_SCHOLAR_PROFILE } from "@/data/scholarships";
import {
  MATCH_WEIGHTS,
  STRONG_MATCH_THRESHOLD,
  analyzeScholarships,
  buildProfileImprovements,
  calculateMatcherProfileCompleteness,
  classifyMatch,
  matchScholarship,
  parseAnnualIncome,
  queryMatches,
} from "@/services/matchingEngine";
import type { MatchCriterion, ScholarProfile } from "@/types";

const baseDate = new Date(2026, 4, 15, 10, 0, 0);
const scholarships = createDemoScholarships(baseDate);
const byId = (id: string) => scholarships.find((s) => s.id === id)!;

const completeProfile: ScholarProfile = {
  ...DEFAULT_SCHOLAR_PROFILE,
  age: 20,
  nationality: "Indian",
  annualFamilyIncome: "Under ₹6,00,000 per annum",
  achievements: "Led a hackathon project and published open source research",
  researchInterests: "Machine learning and open source systems",
  leadershipSummary: "Mentored first-year students and led the coding club research team",
};

function satisfiedCriterion(overrides: Partial<MatchCriterion> = {}): MatchCriterion {
  return {
    id: "test",
    group: "education",
    label: "Test criterion",
    kind: "mandatory",
    state: "satisfied",
    requirement: "requirement",
    studentValue: "value",
    explanation: "explanation",
    weight: 100,
    points: 100,
    ...overrides,
  };
}

describe("GRANTLY Phase 4 — Smart Eligibility Matcher", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  describe("Mandatory criteria", () => {
    it("confirms eligibility when every mandatory criterion passes", () => {
      const match = matchScholarship(DEFAULT_SCHOLAR_PROFILE, byId("demo-sch-06"));
      expect(match.category).toBe("strong");
      expect(match.eligibilityStatus).toBe("Eligible");
      expect(match.score).toBe(100);
      expect(match.missing).toHaveLength(0);
      expect(match.failed).toHaveLength(0);
      expect(match.criteria.every((c) => c.state === "satisfied")).toBe(true);
    });

    it("never lets a high score override a failed mandatory criterion", () => {
      const match = matchScholarship(DEFAULT_SCHOLAR_PROFILE, byId("demo-sch-09"));
      expect(match.score).toBeGreaterThanOrEqual(80);
      expect(match.category).toBe("not-eligible");
      expect(match.eligibilityStatus).toBe("Not Eligible");
      expect(match.failed.map((c) => c.id)).toContain("education-level");
      expect(match.explanation).toMatch(/cannot be offset by a high score/i);

      // Direct rule check at the extreme: a perfect score with one failed rule.
      expect(
        classifyMatch(
          [satisfiedCriterion(), satisfiedCriterion({ id: "f", state: "failed" })],
          100
        )
      ).toBe("not-eligible");
    });

    it("treats missing mandatory information as Potential Match, never as a pass", () => {
      const match = matchScholarship(DEFAULT_SCHOLAR_PROFILE, byId("demo-sch-01"));
      expect(match.category).toBe("potential");
      expect(match.missingFields).toEqual(
        expect.arrayContaining(["age", "leadershipSummary"])
      );
      const ageCriterion = match.criteria.find((c) => c.id === "age")!;
      expect(ageCriterion.state).toBe("needs-information");
      expect(ageCriterion.points).toBe(0);
      expect(match.eligibilityStatus).toBe("Potential Match");
    });

    it("verifies age, income, domicile and institution-type restrictions", () => {
      const tooOld = matchScholarship({ ...completeProfile, age: 40 }, byId("demo-sch-01"));
      expect(tooOld.category).toBe("not-eligible");
      expect(tooOld.failed.map((c) => c.id)).toContain("age");

      const wrongState = matchScholarship({ ...completeProfile, state: "Kerala" }, byId("demo-sch-12"));
      expect(wrongState.failed.map((c) => c.id)).toContain("state");

      const privateInstitution = matchScholarship(
        { ...completeProfile, degreeLevel: "M.Tech Postgraduate", institutionType: "Private" },
        byId("demo-sch-09")
      );
      expect(privateInstitution.failed.map((c) => c.id)).toContain("institution-type");
    });
  });

  describe("Preferred criteria and weighted scoring", () => {
    it("does not block a Strong Match when only preferred criteria are unmet", () => {
      const match = matchScholarship(DEFAULT_SCHOLAR_PROFILE, byId("demo-sch-03"));
      expect(match.category).toBe("strong");
      expect(match.unmetPreferred.map((c) => c.id)).toContain("research");

      const improved = matchScholarship(completeProfile, byId("demo-sch-03"));
      expect(improved.score).toBe(100);
      expect(improved.unmetPreferred).toHaveLength(0);
    });

    it("classifies Low Match when mandatory rules pass but preferences fail", () => {
      const match = matchScholarship(completeProfile, byId("demo-sch-08"));
      expect(match.failed).toHaveLength(0);
      expect(match.missing).toHaveLength(0);
      expect(match.score).toBeLessThan(STRONG_MATCH_THRESHOLD);
      expect(match.category).toBe("low");
      expect(match.eligibilityStatus).toBe("Eligible");
    });

    it("normalises weights over applicable criteria only", () => {
      // demo-sch-06 states education, academic, location and course rules only.
      const lean = matchScholarship(DEFAULT_SCHOLAR_PROFILE, byId("demo-sch-06"));
      expect(lean.applicableWeight).toBe(
        MATCH_WEIGHTS.education + MATCH_WEIGHTS.academic + MATCH_WEIGHTS.location + MATCH_WEIGHTS.course
      );
      expect(lean.criteria.map((c) => c.group)).not.toContain("financial");
      expect(lean.score).toBe(100); // never penalised for rules it does not state

      const weightSum = lean.criteria.reduce((sum, c) => sum + c.weight, 0);
      expect(weightSum).toBeCloseTo(100, 0);

      // demo-sch-03 has no minimum GPA, so the academic group drops out entirely.
      const noGpaRule = matchScholarship(DEFAULT_SCHOLAR_PROFILE, byId("demo-sch-03"));
      expect(noGpaRule.criteria.map((c) => c.group)).not.toContain("academic");
      expect(noGpaRule.applicableWeight).toBe(65);
      expect(noGpaRule.score).toBe(85);
    });

    it("classifies exactly at the 80% boundary", () => {
      expect(classifyMatch([satisfiedCriterion()], 80)).toBe("strong");
      expect(classifyMatch([satisfiedCriterion()], 79)).toBe("low");
      expect(
        classifyMatch([satisfiedCriterion({ state: "needs-information" })], 100)
      ).toBe("potential");
    });

    it("handles the income ceiling boundary inclusively", () => {
      const atCeiling = matchScholarship(
        { ...completeProfile, annualFamilyIncome: "₹8,00,000" },
        byId("demo-sch-02")
      );
      expect(atCeiling.criteria.find((c) => c.id === "income-ceiling")!.state).toBe("satisfied");

      const aboveCeiling = matchScholarship(
        { ...completeProfile, annualFamilyIncome: "₹8,00,001" },
        byId("demo-sch-02")
      );
      expect(aboveCeiling.criteria.find((c) => c.id === "income-ceiling")!.state).toBe("failed");
      expect(aboveCeiling.category).toBe("not-eligible");
    });

    it("is deterministic for identical inputs", () => {
      const a = matchScholarship(DEFAULT_SCHOLAR_PROFILE, byId("demo-sch-04"));
      const b = matchScholarship(DEFAULT_SCHOLAR_PROFILE, byId("demo-sch-04"));
      expect(a.score).toBe(b.score);
      expect(a.criteria).toEqual(b.criteria);
    });
  });

  describe("Malformed and incomplete data", () => {
    it("parses income safely and refuses to guess ambiguous figures", () => {
      expect(parseAnnualIncome("Under ₹8,00,000 per annum")).toBe(800000);
      expect(parseAnnualIncome("6 lakh")).toBe(600000);
      expect(parseAnnualIncome("1.2 crore")).toBe(12000000);
      expect(parseAnnualIncome("850000")).toBe(850000);
      expect(parseAnnualIncome("")).toBeNull();
      expect(parseAnnualIncome("not disclosed")).toBeNull();
      expect(parseAnnualIncome("8")).toBeNull();
      expect(parseAnnualIncome(undefined as unknown as string)).toBeNull();
    });

    it("treats a legacy profile without matcher fields as missing information", () => {
      const legacy = {
        fullName: "Alex Verma",
        email: "alex@example.edu",
        institution: "IIT Bombay",
        degreeLevel: "B.Tech Undergraduate",
        fieldOfStudy: "Computer Science",
        graduationYear: 2027,
        gpa: "8.9 / 10.0",
        annualFamilyIncome: "",
        leadershipSummary: "",
      } as unknown as ScholarProfile;

      const analysis = analyzeScholarships(legacy, scholarships, baseDate);
      expect(analysis.summary.total).toBe(12);
      expect(analysis.summary.strong).toBe(0);
      expect(analysis.summary.potential).toBeGreaterThan(0);
      const ageMatch = analysis.matches.find((m) => m.scholarshipId === "demo-sch-01")!;
      expect(ageMatch.category).toBe("potential");
      expect(calculateMatcherProfileCompleteness(legacy).percentage).toBeLessThan(100);
    });
  });

  describe("Summary, improvements, filtering and sorting", () => {
    it("derives every summary figure from the calculated results", () => {
      const { summary, matches } = analyzeScholarships(DEFAULT_SCHOLAR_PROFILE, scholarships, baseDate);
      expect(summary.total).toBe(12);
      expect(summary.strong).toBe(3);
      expect(summary.potential).toBe(4);
      expect(summary.low).toBe(1);
      expect(summary.notEligible).toBe(4);
      expect(summary.matchingCount).toBe(8);
      expect(summary.strong + summary.potential + summary.low + summary.notEligible).toBe(12);
      expect(summary.profileCompleteness).toBe(69);
      expect(summary.averageScore).toBe(
        Math.round(matches.reduce((sum, m) => sum + m.score, 0) / matches.length)
      );
    });

    it("recalculates when the profile changes", () => {
      const before = analyzeScholarships(DEFAULT_SCHOLAR_PROFILE, scholarships, baseDate);
      const after = analyzeScholarships(completeProfile, scholarships, baseDate);
      expect(before.summary.potential).toBe(4);
      expect(after.summary.potential).toBe(0);
      expect(after.summary.strong).toBe(7);
      expect(after.summary.profileCompleteness).toBe(100);
      // Failed mandatory rules are unaffected by completing information.
      expect(after.summary.notEligible).toBe(before.summary.notEligible);
    });

    it("only recommends supplying missing facts, prioritised by impact", () => {
      const { matches } = analyzeScholarships(DEFAULT_SCHOLAR_PROFILE, scholarships, baseDate);
      const improvements = buildProfileImprovements(DEFAULT_SCHOLAR_PROFILE, matches);
      expect(improvements.length).toBeGreaterThan(0);
      expect(improvements[0].priority).toBeGreaterThan(0);
      expect(improvements.map((i) => i.field)).toContain("annualFamilyIncome");
      for (const improvement of improvements) {
        expect(improvement.action.toLowerCase()).not.toMatch(/change|increase|inflate|edit your gpa/);
        expect(["personal", "education", "financial", "additional"]).toContain(
          improvement.profileSection
        );
      }
      expect(buildProfileImprovements(completeProfile, analyzeScholarships(completeProfile, scholarships).matches)).toHaveLength(0);
    });

    it("filters by category, searches by name or provider and sorts", () => {
      const { matches } = analyzeScholarships(DEFAULT_SCHOLAR_PROFILE, scholarships, baseDate);

      const strong = queryMatches(matches, { filter: "strong", sort: "score-desc", query: "" }, baseDate);
      expect(strong).toHaveLength(3);
      expect(strong.every((m) => m.category === "strong")).toBe(true);

      const byAmount = queryMatches(matches, { filter: "all", sort: "amount-desc", query: "" }, baseDate);
      expect(byAmount[0].scholarshipId).toBe("demo-sch-10");

      const byDeadline = queryMatches(matches, { filter: "all", sort: "deadline-asc", query: "" }, baseDate);
      expect(byDeadline[0].scholarshipId).toBe("demo-sch-01");
      expect(byDeadline[byDeadline.length - 1].scholarshipId).toBe("demo-sch-08");

      const byProvider = queryMatches(
        matches,
        { filter: "all", sort: "score-desc", query: "navodaya" },
        baseDate
      );
      expect(byProvider.map((m) => m.scholarshipId)).toEqual(["demo-sch-02"]);

      expect(
        queryMatches(matches, { filter: "all", sort: "score-desc", query: "zzz" }, baseDate)
      ).toHaveLength(0);
    });
  });

  describe("Matcher page", () => {
    it("renders the analysis overview, improvement section and all results", async () => {
      render(
        <MemoryRouter initialEntries={["/eligibility"]}>
          <AppRoutes />
        </MemoryRouter>
      );

      expect(
        await screen.findByRole("heading", {
          level: 1,
          name: /Your profile matches 8 scholarship opportunities\./i,
        })
      ).toBeInTheDocument();

      const overview = screen.getByRole("region", { name: /Matching overview/i });
      expect(within(overview).getByRole("button", { name: /Scholarships analysed/i })).toHaveTextContent("12");
      expect(within(overview).getByRole("button", { name: /Strong matches/i })).toHaveTextContent("3");
      expect(within(overview).getByRole("button", { name: /Potential matches/i })).toHaveTextContent("4");
      expect(within(overview).getByRole("button", { name: /Low matches/i })).toHaveTextContent("1");
      expect(within(overview).getByRole("button", { name: /Not eligible/i })).toHaveTextContent("4");
      expect(within(overview).getByText(/Profile completeness/i)).toBeInTheDocument();

      expect(screen.getByRole("heading", { name: /Improve Your Match/i })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: /How the scoring works/i })).toBeInTheDocument();
      expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(12);
    });

    it("filters, searches and sorts the rendered results", async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter initialEntries={["/eligibility"]}>
          <AppRoutes />
        </MemoryRouter>
      );
      expect(await screen.findAllByRole("heading", { level: 3 })).toHaveLength(12);

      const tabs = screen.getByRole("group", { name: /Filter matches by category/i });
      await user.click(within(tabs).getByRole("button", { name: /Potential/ }));
      expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(4);

      await user.click(within(tabs).getByRole("button", { name: /Not eligible/ }));
      expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(4);
      expect(screen.getByText(/fail at least one mandatory requirement/i)).toBeInTheDocument();

      await user.click(within(tabs).getByRole("button", { name: /All scholarships/ }));
      await user.selectOptions(screen.getByLabelText(/Sort by/i), "amount-desc");
      expect(screen.getAllByRole("heading", { level: 3 })[0]).toHaveTextContent(
        /Global Doctoral Research Fellowship/i
      );

      await user.type(screen.getByLabelText(/Search matches by scholarship name or provider/i), "aarohan");
      expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(1);
      await user.click(screen.getByRole("button", { name: /Clear match search/i }));
      expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(12);
    });

    it("opens an explainable breakdown and closes it with Escape", async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter initialEntries={["/eligibility"]}>
          <AppRoutes />
        </MemoryRouter>
      );
      expect(await screen.findAllByRole("heading", { level: 3 })).toHaveLength(12);

      await user.click(
        screen.getByRole("button", {
          name: /View match breakdown for Navodaya National Scholars Grant/i,
        })
      );

      const dialog = screen.getByRole("dialog");
      expect(within(dialog).getByText(/How the score was calculated/i)).toBeInTheDocument();
      expect(within(dialog).getAllByText(/Family income ceiling/i).length).toBeGreaterThan(0);
      expect(within(dialog).getAllByText(/Needs information/i).length).toBeGreaterThan(0);
      expect(within(dialog).getAllByText(/Mandatory/i).length).toBeGreaterThan(0);
      expect(within(dialog).getAllByText(/^Required$/i).length).toBeGreaterThan(0);
      expect(within(dialog).getAllByText(/^Your profile$/i).length).toBeGreaterThan(0);

      await user.keyboard("{Escape}");
      await waitForElementToBeRemoved(() => screen.queryByRole("dialog"));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("saves a scholarship from the matcher and persists it", async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter initialEntries={["/eligibility"]}>
          <AppRoutes />
        </MemoryRouter>
      );
      expect(await screen.findAllByRole("heading", { level: 3 })).toHaveLength(12);

      await user.click(
        screen.getByRole("button", { name: /^Save Sankalp Academic Merit Bursary$/i })
      );
      expect(screen.getByText("Scholarship Saved")).toBeInTheDocument();
      expect(window.localStorage.getItem("grantly_v1_saved_scholarships")).toContain("demo-sch-06");
    });

    it("recalculates matches after a profile update from the profile page", async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter initialEntries={["/profile"]}>
          <AppRoutes />
        </MemoryRouter>
      );

      await user.type(
        screen.getByLabelText(/Annual Household Income Bracket/i),
        "Under ₹8,00,000 per annum"
      );
      await user.type(
        screen.getByLabelText(/Leadership, Research & Extracurricular Summary/i),
        "Mentored first-year students and led the coding club research team."
      );
      await user.click(screen.getByRole("button", { name: /Save Profile/i }));

      const primaryNav = screen.getByRole("navigation", { name: /Primary Navigation/i });
      await user.click(within(primaryNav).getByRole("link", { name: /Smart Match/i }));

      expect(
        await screen.findByRole("heading", { level: 1, name: /Your profile matches/i })
      ).toBeInTheDocument();
      const overview = screen.getByRole("region", { name: /Matching overview/i });
      expect(within(overview).getByRole("button", { name: /Potential matches/i })).toHaveTextContent("2");
      expect(within(overview).getByRole("button", { name: /Strong matches/i })).toHaveTextContent("5");
    });

    it("exposes Smart Match in the sidebar navigation", async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <AppRoutes />
        </MemoryRouter>
      );

      const primaryNav = screen.getByRole("navigation", { name: /Primary Navigation/i });
      const link = within(primaryNav).getByRole("link", { name: /Smart Match/i });
      await user.click(link);

      expect(
        await screen.findByRole("heading", { level: 1, name: /Your profile matches/i })
      ).toBeInTheDocument();
      expect(link).toHaveAttribute("aria-current", "page");
    });
  });
});
