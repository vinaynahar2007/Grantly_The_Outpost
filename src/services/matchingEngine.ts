import type {
  CriterionGroup,
  CriterionKind,
  CriterionState,
  MatchCategory,
  MatchCriterion,
  MatchFilter,
  MatchSortOption,
  MatchSummary,
  MatcherProfileCompleteness,
  MatcherProfileField,
  ProfileImprovement,
  ScholarProfile,
  Scholarship,
  ScholarshipMatch,
} from "@/types";
import { deriveEducationLevel, parseGpa } from "@/utils/eligibility";
import { evaluateDeadline, formatINR } from "@/utils/dashboardLogic";

/**
 * GRANTLY Smart Eligibility Matcher — Phase 4.
 *
 * A transparent, deterministic, rule-based engine. No model, no randomness,
 * no hidden heuristics: every point awarded is traceable to a criterion that
 * is rendered in the match breakdown.
 *
 * Non-negotiable rules enforced here:
 *  1. Missing information NEVER earns points and never counts as a match.
 *  2. A failed MANDATORY criterion always yields "Not Eligible" — a high
 *     numeric score can never override it.
 *  3. A missing MANDATORY field yields "Potential Match" (needs information).
 *  4. Only applicable criteria contribute; weights are normalised over the
 *     criteria a scholarship actually states.
 *  5. Student facts are never invented or altered to improve a score.
 */

/** Configurable base weights (percentage points before normalisation). */
export const MATCH_WEIGHTS: Record<CriterionGroup, number> = {
  education: 25,
  academic: 25,
  financial: 20,
  location: 15,
  course: 15,
  personal: 10,
  achievements: 10,
  research: 10,
};

export const STRONG_MATCH_THRESHOLD = 80;

export const CRITERION_GROUP_LABELS: Record<CriterionGroup, string> = {
  education: "Education level",
  academic: "Academic performance",
  financial: "Financial eligibility",
  location: "Location & domicile",
  course: "Course / field of study",
  personal: "Personal requirements",
  achievements: "Achievements & evidence",
  research: "Research interests",
};

export const MATCH_CATEGORY_LABELS: Record<MatchCategory, string> = {
  strong: "Strong Match",
  potential: "Potential Match",
  low: "Low Match",
  "not-eligible": "Not Eligible",
};

export const MATCHER_FIELD_LABELS: Record<MatcherProfileField, string> = {
  fullName: "Full name",
  email: "Academic email",
  institution: "Institution",
  institutionType: "Institution type",
  degreeLevel: "Current education level",
  fieldOfStudy: "Course / field of study",
  academicYear: "Current academic year",
  graduationYear: "Expected graduation year",
  gpa: "Academic percentage or GPA",
  age: "Age",
  state: "State",
  country: "Country",
  nationality: "Nationality",
  annualFamilyIncome: "Annual family income",
  financialBackground: "Financial background",
  socialCategory: "Category",
  achievements: "Achievements",
  researchInterests: "Research interests",
  leadershipSummary: "Leadership & research summary",
};

const FIELD_SECTION: Record<MatcherProfileField, ProfileImprovement["profileSection"]> = {
  fullName: "personal",
  email: "personal",
  age: "personal",
  state: "personal",
  country: "personal",
  nationality: "personal",
  institution: "education",
  institutionType: "education",
  degreeLevel: "education",
  fieldOfStudy: "education",
  academicYear: "education",
  graduationYear: "education",
  gpa: "education",
  annualFamilyIncome: "financial",
  financialBackground: "financial",
  socialCategory: "additional",
  achievements: "additional",
  researchInterests: "additional",
  leadershipSummary: "additional",
};

/** Fields counted towards matcher profile completeness (all optional facts). */
const COMPLETENESS_FIELDS: MatcherProfileField[] = [
  "fullName",
  "email",
  "institution",
  "institutionType",
  "degreeLevel",
  "fieldOfStudy",
  "academicYear",
  "graduationYear",
  "gpa",
  "age",
  "state",
  "country",
  "nationality",
  "annualFamilyIncome",
  "achievements",
  "researchInterests",
];

/* ------------------------------------------------------------------ */
/* Safe parsing helpers — malformed values become "not provided"        */
/* ------------------------------------------------------------------ */

export function isFieldProvided(profile: ScholarProfile, field: MatcherProfileField): boolean {
  const value = profile?.[field];
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (field === "leadershipSummary" || field === "achievements" || field === "researchInterests") {
      return trimmed.length >= 10;
    }
    return trimmed.length > 0;
  }
  return false;
}

/**
 * Reads an annual income out of free text ("Under ₹8,00,000 per annum",
 * "8 lakh", "₹850000"). Returns null when no dependable figure exists —
 * the engine then reports missing information rather than guessing.
 */
export function parseAnnualIncome(raw: string): number | null {
  if (typeof raw !== "string") return null;
  const text = raw.toLowerCase().replace(/[,₹\s]/g, "");
  if (!text) return null;
  const match = text.match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value) || value <= 0) return null;

  if (text.includes("crore") || text.includes("cr")) return Math.round(value * 10000000);
  if (text.includes("lakh") || text.includes("lac")) return Math.round(value * 100000);
  if (text.includes("thousand") || /\dk/.test(text)) return Math.round(value * 1000);
  // A bare figure below 1,000 is ambiguous (lakh? thousand?) — do not assume.
  if (value < 1000) return null;
  return Math.round(value);
}

function studentValueLabel(profile: ScholarProfile, field: MatcherProfileField): string {
  const value = profile?.[field];
  if (!isFieldProvided(profile, field)) return "Not provided";
  if (field === "annualFamilyIncome") {
    const parsed = parseAnnualIncome(String(value));
    return parsed == null ? `“${String(value)}” (figure not readable)` : formatINR(parsed);
  }
  return String(value);
}

function includesKeyword(haystack: string, keywords: string[]): string | null {
  const text = haystack.toLowerCase();
  return keywords.find((keyword) => text.includes(keyword.toLowerCase())) ?? null;
}

type CriterionDraft = Omit<MatchCriterion, "weight" | "points">;

function draft(
  id: string,
  group: CriterionGroup,
  label: string,
  kind: CriterionKind,
  state: CriterionState,
  requirement: string,
  studentValue: string,
  explanation: string,
  profileField?: MatcherProfileField
): CriterionDraft {
  return { id, group, label, kind, state, requirement, studentValue, explanation, profileField };
}

/* ------------------------------------------------------------------ */
/* Criterion evaluation                                                */
/* ------------------------------------------------------------------ */

function evaluateCriteria(profile: ScholarProfile, scholarship: Scholarship): CriterionDraft[] {
  const rules = scholarship.matchRequirements;
  const criteria: CriterionDraft[] = [];

  /* ---------------- Education ---------------- */
  const level = deriveEducationLevel(profile);
  const levelList = scholarship.educationLevels.join(" / ");
  if (!level) {
    criteria.push(
      draft(
        "education-level",
        "education",
        "Education level",
        "mandatory",
        "needs-information",
        levelList,
        "Not provided",
        "Your current education level is not on your profile, so this requirement cannot be verified.",
        "degreeLevel"
      )
    );
  } else if (scholarship.educationLevels.includes(level)) {
    criteria.push(
      draft(
        "education-level",
        "education",
        "Education level",
        "mandatory",
        "satisfied",
        levelList,
        level,
        `Satisfied — your profile records ${level}, which this scholarship accepts.`
      )
    );
  } else {
    criteria.push(
      draft(
        "education-level",
        "education",
        "Education level",
        "mandatory",
        "failed",
        levelList,
        level,
        `Not satisfied — this award is restricted to ${levelList}; your profile records ${level}.`
      )
    );
  }

  if (rules.academicYears.length > 0) {
    const year = profile.academicYear;
    const required = rules.academicYears.map((y) => `Year ${y}`).join(" or ");
    if (!isFieldProvided(profile, "academicYear")) {
      criteria.push(
        draft("academic-year", "education", "Academic year", "mandatory", "needs-information",
          required, "Not provided", "Add your current year of study to verify this requirement.", "academicYear")
      );
    } else if (year != null && rules.academicYears.includes(year)) {
      criteria.push(
        draft("academic-year", "education", "Academic year", "mandatory", "satisfied",
          required, `Year ${year}`, `Satisfied — you are in year ${year} of study.`)
      );
    } else {
      criteria.push(
        draft("academic-year", "education", "Academic year", "mandatory", "failed",
          required, `Year ${year}`, `Not satisfied — this award is limited to ${required}.`)
      );
    }
  }

  if (rules.institutionTypes.length > 0) {
    const required = rules.institutionTypes.join(" / ");
    if (!isFieldProvided(profile, "institutionType")) {
      criteria.push(
        draft("institution-type", "education", "Institution type", "mandatory", "needs-information",
          required, "Not provided", "Add your institution type (government, aided or private).", "institutionType")
      );
    } else if (rules.institutionTypes.includes(profile.institutionType as never)) {
      criteria.push(
        draft("institution-type", "education", "Institution type", "mandatory", "satisfied",
          required, profile.institutionType, `Satisfied — ${profile.institutionType} institutions qualify.`)
      );
    } else {
      criteria.push(
        draft("institution-type", "education", "Institution type", "mandatory", "failed",
          required, profile.institutionType, `Not satisfied — only ${required} institutions qualify.`)
      );
    }
  }

  /* ---------------- Academic performance ---------------- */
  if (rules.minGpa != null) {
    const gpa = parseGpa(profile.gpa ?? "");
    const required = `${rules.minGpa.toFixed(1)} / 10 CGPA (${Math.round(rules.minGpa * 10)}%)`;
    if (gpa == null) {
      criteria.push(
        draft("min-gpa", "academic", "Minimum academic score", "mandatory", "needs-information",
          required, "Not provided", "Add your academic percentage or GPA to verify the minimum score.", "gpa")
      );
    } else if (gpa >= rules.minGpa) {
      criteria.push(
        draft("min-gpa", "academic", "Minimum academic score", "mandatory", "satisfied",
          required, `${gpa.toFixed(1)} / 10 (${Math.round(gpa * 10)}%)`,
          `Satisfied — your score of ${Math.round(gpa * 10)}% is at or above the required ${Math.round(rules.minGpa * 10)}%.`)
      );
    } else {
      criteria.push(
        draft("min-gpa", "academic", "Minimum academic score", "mandatory", "failed",
          required, `${gpa.toFixed(1)} / 10 (${Math.round(gpa * 10)}%)`,
          `Not satisfied — ${Math.round(rules.minGpa * 10)}% is required and your profile records ${Math.round(gpa * 10)}%.`)
      );
    }
  }

  /* ---------------- Financial ---------------- */
  if (rules.maxAnnualIncome != null) {
    const income = parseAnnualIncome(profile.annualFamilyIncome ?? "");
    const ceiling = formatINR(rules.maxAnnualIncome);
    if (income == null) {
      criteria.push(
        draft("income-ceiling", "financial", "Family income ceiling", "mandatory", "needs-information",
          `Up to ${ceiling} per annum`, studentValueLabel(profile, "annualFamilyIncome"),
          "Family income is not recorded, so this need-based requirement cannot be verified.",
          "annualFamilyIncome")
      );
    } else if (income <= rules.maxAnnualIncome) {
      criteria.push(
        draft("income-ceiling", "financial", "Family income ceiling", "mandatory", "satisfied",
          `Up to ${ceiling} per annum`, formatINR(income),
          `Satisfied — ${formatINR(income)} is within the ${ceiling} ceiling.`)
      );
    } else {
      criteria.push(
        draft("income-ceiling", "financial", "Family income ceiling", "mandatory", "failed",
          `Up to ${ceiling} per annum`, formatINR(income),
          `Not satisfied — ${formatINR(income)} exceeds the ${ceiling} ceiling.`)
      );
    }
  }

  /* ---------------- Location & domicile ---------------- */
  if (rules.allowedCountries.length > 0) {
    const required = rules.allowedCountries.join(" / ");
    if (!isFieldProvided(profile, "country")) {
      criteria.push(
        draft("country", "location", "Country of residence", "mandatory", "needs-information",
          required, "Not provided", "Add your country so domicile can be verified.", "country")
      );
    } else if (rules.allowedCountries.some((c) => c.toLowerCase() === profile.country.trim().toLowerCase())) {
      criteria.push(
        draft("country", "location", "Country of residence", "mandatory", "satisfied",
          required, profile.country, `Satisfied — this national award accepts applicants from ${profile.country}.`)
      );
    } else {
      criteria.push(
        draft("country", "location", "Country of residence", "mandatory", "failed",
          required, profile.country, `Not satisfied — restricted to applicants from ${required}.`)
      );
    }
  }

  if (rules.allowedStates.length > 0) {
    const required = rules.allowedStates.join(" / ");
    if (!isFieldProvided(profile, "state")) {
      criteria.push(
        draft("state", "location", "State domicile", "mandatory", "needs-information",
          required, "Not provided", "Add your state to verify this state-level restriction.", "state")
      );
    } else if (rules.allowedStates.some((s) => s.toLowerCase() === profile.state.trim().toLowerCase())) {
      criteria.push(
        draft("state", "location", "State domicile", "mandatory", "satisfied",
          required, profile.state, `Satisfied — ${profile.state} is an eligible state.`)
      );
    } else {
      criteria.push(
        draft("state", "location", "State domicile", "mandatory", "failed",
          required, profile.state, `Not satisfied — this award is limited to ${required}.`)
      );
    }
  }

  if (rules.allowedNationalities.length > 0) {
    const required = rules.allowedNationalities.join(" / ");
    if (!isFieldProvided(profile, "nationality")) {
      criteria.push(
        draft("nationality", "location", "Nationality", "mandatory", "needs-information",
          required, "Not provided", "Add your nationality to verify this international award.", "nationality")
      );
    } else if (rules.allowedNationalities.some((n) => n.toLowerCase() === profile.nationality.trim().toLowerCase())) {
      criteria.push(
        draft("nationality", "location", "Nationality", "mandatory", "satisfied",
          required, profile.nationality, `Satisfied — ${profile.nationality} nationals qualify.`)
      );
    } else {
      criteria.push(
        draft("nationality", "location", "Nationality", "mandatory", "failed",
          required, profile.nationality, `Not satisfied — restricted to ${required} nationals.`)
      );
    }
  }

  /* ---------------- Course / field of study ---------------- */
  const courseField = profile.fieldOfStudy ?? "";
  if (rules.courseKeywords.length > 0) {
    const required = rules.courseKeywords.join(", ");
    if (!isFieldProvided(profile, "fieldOfStudy")) {
      criteria.push(
        draft("course", "course", "Course requirement", "mandatory", "needs-information",
          required, "Not provided", "Add your current course to check this restriction.", "fieldOfStudy")
      );
    } else {
      const hit = includesKeyword(courseField, rules.courseKeywords);
      criteria.push(
        hit
          ? draft("course", "course", "Course requirement", "mandatory", "satisfied",
              required, courseField, `Satisfied — “${courseField}” matches the accepted field “${hit}”.`)
          : draft("course", "course", "Course requirement", "mandatory", "failed",
              required, courseField, `Not satisfied — this award accepts ${required}.`)
      );
    }
  } else if (rules.preferredCourseKeywords.length === 0) {
    criteria.push(
      draft("course-open", "course", "Course requirement", "mandatory", "satisfied",
        "Open to all fields of study", isFieldProvided(profile, "fieldOfStudy") ? courseField : "Not provided",
        "Satisfied — this scholarship states no course restriction.")
    );
  }

  if (rules.preferredCourseKeywords.length > 0) {
    const required = rules.preferredCourseKeywords.join(", ");
    if (!isFieldProvided(profile, "fieldOfStudy")) {
      criteria.push(
        draft("course-preferred", "course", "Preferred course focus", "preferred", "needs-information",
          required, "Not provided", "Adding your course would let us score this preference.", "fieldOfStudy")
      );
    } else {
      const hit = includesKeyword(courseField, rules.preferredCourseKeywords);
      criteria.push(
        hit
          ? draft("course-preferred", "course", "Preferred course focus", "preferred", "satisfied",
              required, courseField, `Preferred focus matched (${hit}) — bonus points awarded.`)
          : draft("course-preferred", "course", "Preferred course focus", "preferred", "failed",
              required, courseField,
              `Preference not met — this provider favours ${required}. This does not block eligibility.`)
      );
    }
  }

  /* ---------------- Personal ---------------- */
  if (rules.minAge != null || rules.maxAge != null) {
    const required =
      rules.minAge != null && rules.maxAge != null
        ? `${rules.minAge}–${rules.maxAge} years`
        : rules.minAge != null
          ? `${rules.minAge} years or older`
          : `${rules.maxAge} years or younger`;
    if (!isFieldProvided(profile, "age")) {
      criteria.push(
        draft("age", "personal", "Age restriction", "mandatory", "needs-information",
          required, "Not provided", "Add your age to verify this restriction.", "age")
      );
    } else {
      const age = profile.age as number;
      const ok =
        (rules.minAge == null || age >= rules.minAge) && (rules.maxAge == null || age <= rules.maxAge);
      criteria.push(
        ok
          ? draft("age", "personal", "Age restriction", "mandatory", "satisfied",
              required, `${age} years`, `Satisfied — ${age} falls within ${required}.`)
          : draft("age", "personal", "Age restriction", "mandatory", "failed",
              required, `${age} years`, `Not satisfied — the award is restricted to ${required}.`)
      );
    }
  }

  if (rules.socialCategories.length > 0) {
    const required = rules.socialCategories.join(" / ");
    if (!isFieldProvided(profile, "socialCategory")) {
      criteria.push(
        draft("category", "personal", "Category reservation", "mandatory", "needs-information",
          required, "Not provided",
          "This award reserves places for specific categories. Share your category only if you wish to be assessed.",
          "socialCategory")
      );
    } else if (rules.socialCategories.includes(profile.socialCategory)) {
      criteria.push(
        draft("category", "personal", "Category reservation", "mandatory", "satisfied",
          required, profile.socialCategory, "Satisfied — your declared category is covered by this reservation.")
      );
    } else {
      criteria.push(
        draft("category", "personal", "Category reservation", "mandatory", "failed",
          required, profile.socialCategory, `Not satisfied — reserved for ${required}.`)
      );
    }
  }

  /* ---------------- Achievements / research (preferred) ---------------- */
  if (rules.preferredAchievementKeywords.length > 0) {
    const required = rules.preferredAchievementKeywords.join(", ");
    const source = `${profile.achievements ?? ""} ${profile.leadershipSummary ?? ""}`;
    if (!isFieldProvided(profile, "achievements") && !isFieldProvided(profile, "leadershipSummary")) {
      criteria.push(
        draft("achievements", "achievements", "Preferred achievements", "preferred", "needs-information",
          required, "Not provided",
          "Describe your achievements to score this preference. It never blocks eligibility.",
          "achievements")
      );
    } else {
      const hit = includesKeyword(source, rules.preferredAchievementKeywords);
      criteria.push(
        hit
          ? draft("achievements", "achievements", "Preferred achievements", "preferred", "satisfied",
              required, "Recorded on profile", `Preferred achievement matched (${hit}).`)
          : draft("achievements", "achievements", "Preferred achievements", "preferred", "failed",
              required, "Recorded on profile",
              `No listed achievement matched ${required}. This does not block eligibility.`)
      );
    }
  }

  if (rules.preferredResearchKeywords.length > 0) {
    const required = rules.preferredResearchKeywords.join(", ");
    const source = `${profile.researchInterests ?? ""} ${profile.leadershipSummary ?? ""}`;
    if (!isFieldProvided(profile, "researchInterests") && !isFieldProvided(profile, "leadershipSummary")) {
      criteria.push(
        draft("research", "research", "Research interests", "preferred", "needs-information",
          required, "Not provided",
          "Add your research interests to score this preference. It never blocks eligibility.",
          "researchInterests")
      );
    } else {
      const hit = includesKeyword(source, rules.preferredResearchKeywords);
      criteria.push(
        hit
          ? draft("research", "research", "Research interests", "preferred", "satisfied",
              required, "Recorded on profile", `Research interest matched (${hit}).`)
          : draft("research", "research", "Research interests", "preferred", "failed",
              required, "Recorded on profile",
              `Your stated interests do not yet mention ${required}. This does not block eligibility.`)
      );
    }
  }

  /* ---------------- Mandatory supporting evidence ---------------- */
  for (const field of rules.evidenceFields) {
    if (field === "gpa" || field === "fieldOfStudy" || field === "degreeLevel") continue;
    const group: CriterionGroup =
      field === "annualFamilyIncome"
        ? "financial"
        : field === "institution"
          ? "education"
          : "achievements";
    const provided = isFieldProvided(profile, field);
    criteria.push(
      draft(
        `evidence-${field}`,
        group,
        MATCHER_FIELD_LABELS[field],
        "mandatory",
        provided ? "satisfied" : "needs-information",
        "Must be supplied with the application",
        studentValueLabel(profile, field),
        provided
          ? `Satisfied — ${MATCHER_FIELD_LABELS[field].toLowerCase()} is recorded on your profile.`
          : `${MATCHER_FIELD_LABELS[field]} is required by this scholarship and is not on your profile yet.`,
        field
      )
    );
  }

  return criteria;
}

/* ------------------------------------------------------------------ */
/* Scoring                                                             */
/* ------------------------------------------------------------------ */

function scoreCriteria(drafts: CriterionDraft[]): {
  criteria: MatchCriterion[];
  score: number;
  applicableWeight: number;
  earnedPoints: number;
} {
  const applicable = drafts.filter((c) => c.state !== "not-applicable");
  const groupCounts = new Map<CriterionGroup, number>();
  for (const criterion of applicable) {
    groupCounts.set(criterion.group, (groupCounts.get(criterion.group) ?? 0) + 1);
  }

  const rawWeights = applicable.map(
    (criterion) => MATCH_WEIGHTS[criterion.group] / (groupCounts.get(criterion.group) ?? 1)
  );
  const applicableWeight = rawWeights.reduce((sum, weight) => sum + weight, 0);

  let earnedRaw = 0;
  const criteria: MatchCriterion[] = applicable.map((criterion, index) => {
    const raw = rawWeights[index];
    const weight = applicableWeight > 0 ? (raw / applicableWeight) * 100 : 0;
    const points = criterion.state === "satisfied" ? weight : 0;
    earnedRaw += points;
    return {
      ...criterion,
      weight: Math.round(weight * 10) / 10,
      points: Math.round(points * 10) / 10,
    };
  });

  const score = applicableWeight > 0 ? Math.round(earnedRaw) : 0;
  return {
    criteria,
    score: Math.max(0, Math.min(100, score)),
    applicableWeight: Math.round(applicableWeight * 10) / 10,
    earnedPoints: Math.round(earnedRaw * 10) / 10,
  };
}

/** Classification is rule-first: a failed mandatory criterion always wins. */
export function classifyMatch(criteria: MatchCriterion[], score: number): MatchCategory {
  const failedMandatory = criteria.some((c) => c.kind === "mandatory" && c.state === "failed");
  if (failedMandatory) return "not-eligible";
  const missingMandatory = criteria.some(
    (c) => c.kind === "mandatory" && c.state === "needs-information"
  );
  if (missingMandatory) return "potential";
  return score >= STRONG_MATCH_THRESHOLD ? "strong" : "low";
}

function buildExplanation(
  category: MatchCategory,
  score: number,
  matched: MatchCriterion[],
  missing: MatchCriterion[],
  failed: MatchCriterion[],
  unmetPreferred: MatchCriterion[]
): string {
  if (category === "not-eligible") {
    return `Not eligible — ${failed[0]?.explanation ?? "a mandatory requirement is not met."} A failed mandatory requirement cannot be offset by a high score.`;
  }
  if (category === "potential") {
    const labels = missing.map((c) => c.label.toLowerCase()).join(", ");
    return `Potential match — ${matched.length} requirement${matched.length === 1 ? "" : "s"} already confirmed at ${score}%, but ${labels} ${missing.length === 1 ? "is" : "are"} still needed before eligibility can be confirmed.`;
  }
  if (category === "strong") {
    return `Strong match — every mandatory requirement is satisfied and your profile scores ${score}% across the criteria this scholarship states.`;
  }
  return `Low match — all mandatory requirements pass, but ${unmetPreferred.length} preferred ${unmetPreferred.length === 1 ? "criterion is" : "criteria are"} unmet, holding the score at ${score}%.`;
}

/** Evaluates one scholarship against the student profile. Pure + deterministic. */
export function matchScholarship(
  profile: ScholarProfile,
  scholarship: Scholarship
): ScholarshipMatch {
  const drafts = evaluateCriteria(profile, scholarship);
  const { criteria, score, applicableWeight, earnedPoints } = scoreCriteria(drafts);
  const category = classifyMatch(criteria, score);

  const matched = criteria.filter((c) => c.state === "satisfied");
  const missing = criteria.filter(
    (c) => c.state === "needs-information" && c.kind === "mandatory"
  );
  const failed = criteria.filter((c) => c.state === "failed" && c.kind === "mandatory");
  const unmetPreferred = criteria.filter(
    (c) => c.kind === "preferred" && c.state !== "satisfied"
  );

  const missingFields = Array.from(
    new Set(
      criteria
        .filter((c) => c.state === "needs-information" && c.profileField)
        .map((c) => c.profileField as MatcherProfileField)
    )
  );

  return {
    scholarshipId: scholarship.id,
    scholarship,
    score,
    category,
    eligibilityStatus:
      category === "not-eligible"
        ? "Not Eligible"
        : category === "potential"
          ? "Potential Match"
          : "Eligible",
    criteria,
    matched,
    missing,
    failed,
    unmetPreferred,
    missingFields,
    applicableWeight,
    earnedPoints,
    explanation: buildExplanation(category, score, matched, missing, failed, unmetPreferred),
  };
}

export function calculateMatcherProfileCompleteness(
  profile: ScholarProfile
): MatcherProfileCompleteness {
  const completedFields = COMPLETENESS_FIELDS.filter((field) => isFieldProvided(profile, field));
  const missingFields = COMPLETENESS_FIELDS.filter((field) => !isFieldProvided(profile, field));
  return {
    percentage: Math.round((completedFields.length / COMPLETENESS_FIELDS.length) * 100),
    completedCount: completedFields.length,
    totalCount: COMPLETENESS_FIELDS.length,
    completedFields,
    missingFields,
  };
}

const IMPROVEMENT_COPY: Partial<Record<MatcherProfileField, { title: string; action: string }>> = {
  gpa: { title: "Add your academic percentage", action: "Enter your latest CGPA or percentage" },
  degreeLevel: { title: "Complete your education information", action: "Set your current education level" },
  fieldOfStudy: { title: "Add your current course", action: "Record your course or field of study" },
  academicYear: { title: "Add your current academic year", action: "Set your year of study" },
  institutionType: { title: "Add your institution type", action: "Select government, aided or private" },
  institution: { title: "Add your institution", action: "Record your college or university" },
  annualFamilyIncome: { title: "Provide financial information", action: "Add your annual family income" },
  financialBackground: { title: "Describe your financial background", action: "Add supporting financial context" },
  state: { title: "Update your location", action: "Add your state of domicile" },
  country: { title: "Update your country", action: "Add your country of residence" },
  nationality: { title: "Add your nationality", action: "Record your nationality for international awards" },
  age: { title: "Add your age", action: "Record your age for age-restricted awards" },
  achievements: { title: "Describe your achievements", action: "List projects, awards and activities" },
  researchInterests: { title: "Add your research interests", action: "Describe the topics you work on" },
  leadershipSummary: { title: "Add your leadership summary", action: "Summarise leadership and research work" },
  socialCategory: { title: "Share your category (optional)", action: "Only if you want reservation-based awards assessed" },
};

/**
 * Actionable "Improve Your Match" suggestions. These only ever ask the
 * student to SUPPLY missing facts — never to change a factual answer.
 */
export function buildProfileImprovements(
  profile: ScholarProfile,
  matches: ScholarshipMatch[],
  limit = 6
): ProfileImprovement[] {
  const impact = new Map<MatcherProfileField, { mandatory: number; total: number }>();

  for (const match of matches) {
    if (match.category === "not-eligible") continue;
    for (const criterion of match.criteria) {
      if (criterion.state !== "needs-information" || !criterion.profileField) continue;
      const entry = impact.get(criterion.profileField) ?? { mandatory: 0, total: 0 };
      entry.total += 1;
      if (criterion.kind === "mandatory") entry.mandatory += 1;
      impact.set(criterion.profileField, entry);
    }
  }

  const completeness = calculateMatcherProfileCompleteness(profile);
  for (const field of completeness.missingFields) {
    if (!impact.has(field)) impact.set(field, { mandatory: 0, total: 0 });
  }

  return Array.from(impact.entries())
    .map(([field, counts]) => {
      const copy = IMPROVEMENT_COPY[field] ?? {
        title: `Add ${MATCHER_FIELD_LABELS[field].toLowerCase()}`,
        action: `Complete ${MATCHER_FIELD_LABELS[field].toLowerCase()} on your profile`,
      };
      return {
        id: `improve-${field}`,
        field,
        title: copy.title,
        action: copy.action,
        rationale:
          counts.mandatory > 0
            ? `Required by ${counts.mandatory} scholarship${counts.mandatory === 1 ? "" : "s"} currently held at Potential Match.`
            : counts.total > 0
              ? `Adds preferred-criteria points across ${counts.total} scholarship${counts.total === 1 ? "" : "s"}.`
              : "Improves overall profile readiness for future matching.",
        affectedScholarships: counts.total,
        profileSection: FIELD_SECTION[field],
        priority: counts.mandatory,
      };
    })
    .sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      if (b.affectedScholarships !== a.affectedScholarships) {
        return b.affectedScholarships - a.affectedScholarships;
      }
      return a.title.localeCompare(b.title);
    })
    .slice(0, limit)
    .map((improvement) => improvement);
}

export interface MatchAnalysis {
  matches: ScholarshipMatch[];
  summary: MatchSummary;
  completeness: MatcherProfileCompleteness;
  improvements: ProfileImprovement[];
}

/** Runs the full analysis. Nothing is cached or persisted — always recomputed. */
export function analyzeScholarships(
  profile: ScholarProfile,
  scholarships: Scholarship[],
  now: Date = new Date()
): MatchAnalysis {
  const matches = scholarships.map((scholarship) => matchScholarship(profile, scholarship));
  const completeness = calculateMatcherProfileCompleteness(profile);

  const strong = matches.filter((m) => m.category === "strong").length;
  const potential = matches.filter((m) => m.category === "potential").length;
  const low = matches.filter((m) => m.category === "low").length;
  const notEligible = matches.filter((m) => m.category === "not-eligible").length;

  const summary: MatchSummary = {
    total: matches.length,
    strong,
    potential,
    low,
    notEligible,
    matchingCount: strong + potential + low,
    averageScore:
      matches.length > 0
        ? Math.round(matches.reduce((sum, m) => sum + m.score, 0) / matches.length)
        : 0,
    profileCompleteness: completeness.percentage,
    analyzedAt: now.toISOString(),
  };

  return {
    matches,
    summary,
    completeness,
    improvements: buildProfileImprovements(profile, matches),
  };
}

/** Search + category filter + sort for the matcher results list. */
export function queryMatches(
  matches: ScholarshipMatch[],
  options: { filter: MatchFilter; sort: MatchSortOption; query: string },
  now: Date = new Date()
): ScholarshipMatch[] {
  const normalized = options.query.trim().toLowerCase();

  const filtered = matches.filter((match) => {
    if (options.filter !== "all" && match.category !== options.filter) return false;
    if (!normalized) return true;
    return (
      match.scholarship.title.toLowerCase().includes(normalized) ||
      match.scholarship.provider.toLowerCase().includes(normalized)
    );
  });

  const sorted = [...filtered];
  switch (options.sort) {
    case "amount-desc":
      sorted.sort((a, b) => b.scholarship.amount - a.scholarship.amount);
      break;
    case "deadline-asc":
      sorted.sort((a, b) => {
        const ra = evaluateDeadline(a.scholarship.deadline, now).remainingDays;
        const rb = evaluateDeadline(b.scholarship.deadline, now).remainingDays;
        return (ra < 0 ? Number.MAX_SAFE_INTEGER : ra) - (rb < 0 ? Number.MAX_SAFE_INTEGER : rb);
      });
      break;
    case "score-desc":
    default:
      sorted.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return b.scholarship.amount - a.scholarship.amount;
      });
      break;
  }
  return sorted;
}

/** Aggregates criterion outcomes per group for the distribution chart. */
export function summarizeCriteriaByGroup(matches: ScholarshipMatch[]) {
  const groups = Object.keys(MATCH_WEIGHTS) as CriterionGroup[];
  return groups
    .map((group) => {
      const criteria = matches.flatMap((m) => m.criteria.filter((c) => c.group === group));
      return {
        group,
        label: CRITERION_GROUP_LABELS[group],
        satisfied: criteria.filter((c) => c.state === "satisfied").length,
        needsInformation: criteria.filter((c) => c.state === "needs-information").length,
        failed: criteria.filter((c) => c.state === "failed").length,
        total: criteria.length,
      };
    })
    .filter((row) => row.total > 0);
}
