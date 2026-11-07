import type {
  EducationLevel,
  EligibilityResult,
  ProfileFieldKey,
  ScholarProfile,
  Scholarship,
} from "@/types";

/**
 * Smart-eligibility preparation utility (Phase 3).
 *
 * The full Smart Eligibility Matcher arrives in Phase 4. This reusable,
 * framework-free utility already enforces the core honesty rules:
 *  - Eligibility is NEVER confirmed while mandatory profile information
 *    is missing — the result is downgraded to "Potential Match".
 *  - Student information is NEVER invented — unknown fields are reported
 *    as missing instead of being assumed.
 *  - Hard failures (wrong education level, GPA below a stated minimum)
 *    always produce "Not Eligible", regardless of other strengths.
 */

export const PROFILE_FIELD_LABELS: Record<ProfileFieldKey, string> = {
  fullName: "Full name",
  email: "Academic email",
  institution: "Institution",
  degreeLevel: "Degree level",
  fieldOfStudy: "Field of study",
  graduationYear: "Expected graduation year",
  gpa: "GPA / academic standing",
  annualFamilyIncome: "Household income bracket",
  leadershipSummary: "Leadership & research summary",
};

function isProfileFieldPresent(profile: ScholarProfile, field: ProfileFieldKey): boolean {
  const value = profile[field];
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "string") {
    if (field === "leadershipSummary") return value.trim().length >= 15;
    return value.trim().length > 0;
  }
  return value != null;
}

/**
 * Derives a structured education level from the free-text degree level on
 * the student profile. Returns null when it cannot be determined — the
 * caller must treat that as missing information, never guess.
 */
export function deriveEducationLevel(profile: ScholarProfile): EducationLevel | null {
  const text = profile.degreeLevel.trim().toLowerCase();
  if (!text) return null;
  if (text.includes("phd") || text.includes("ph.d") || text.includes("doctoral")) {
    return "Doctoral";
  }
  if (
    text.includes("postgraduate") ||
    text.includes("master") ||
    text.includes("m.tech") ||
    text.includes("mtech") ||
    text.includes("mba") ||
    text.includes("m.sc") ||
    text.includes("msc")
  ) {
    return "Postgraduate";
  }
  if (text.includes("diploma")) return "Diploma";
  if (
    text.includes("undergraduate") ||
    text.includes("bachelor") ||
    text.includes("b.tech") ||
    text.includes("btech") ||
    text.includes("b.e") ||
    text.includes("b.sc") ||
    text.includes("bsc") ||
    text.includes("b.a") ||
    text.includes("b.com")
  ) {
    return "Undergraduate";
  }
  if (text.includes("school") || text.includes("class")) return "School";
  return null;
}

/**
 * Parses a CGPA/percentage out of the free-text GPA profile field.
 * Returns a 10-point-scale value, or null when it cannot be determined.
 */
export function parseGpa(raw: string): number | null {
  const text = raw.trim();
  if (!text) return null;
  const match = text.match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value)) return null;
  // Percentage-style entries (e.g. "89%") are normalised to a 10-point scale.
  if (text.includes("%") || value > 10) return Math.round(value) / 10;
  return value;
}

/**
 * Calculates an explainable eligibility result for one scholarship against
 * the student's actual profile. Pure function — safe to memoise and test.
 */
export function calculateEligibility(
  profile: ScholarProfile,
  scholarship: Scholarship
): EligibilityResult {
  const requirements = scholarship.eligibilityRequirements;
  const missingProfileInfo: string[] = [];
  const matchedCriteria: string[] = [];
  const failedCriteria: string[] = [];

  const missingKeys = new Set<string>();
  const addMissing = (field: ProfileFieldKey) => {
    if (!missingKeys.has(field)) {
      missingKeys.add(field);
      missingProfileInfo.push(PROFILE_FIELD_LABELS[field]);
    }
  };

  let score = 0;
  let hardFail = false;

  /* --- Education level (35 pts, hard requirement) --- */
  const studentLevel = deriveEducationLevel(profile);
  if (!studentLevel) {
    addMissing("degreeLevel");
  } else if (scholarship.educationLevels.includes(studentLevel)) {
    score += 35;
    matchedCriteria.push(`Education level: ${studentLevel}`);
  } else {
    hardFail = true;
    failedCriteria.push(
      `Requires ${scholarship.educationLevels.join(" / ")} (your profile: ${studentLevel})`
    );
  }

  /* --- Academic standing / GPA (25 pts, hard when a minimum is stated) --- */
  const gpa = parseGpa(profile.gpa);
  if (requirements.minGpa != null) {
    if (gpa == null) {
      addMissing("gpa");
    } else if (gpa >= requirements.minGpa) {
      score += 25;
      matchedCriteria.push(`CGPA ${gpa} meets the ${requirements.minGpa} minimum`);
    } else {
      hardFail = true;
      failedCriteria.push(`Requires CGPA ${requirements.minGpa} or above (your profile: ${gpa})`);
    }
  } else if (gpa != null) {
    score += 25;
    matchedCriteria.push("Academic standing recorded on profile");
  } else {
    addMissing("gpa");
  }

  /* --- Field-of-study relevance (20 pts, soft) --- */
  const keywords = requirements.acceptedFieldKeywords;
  if (keywords.length === 0) {
    score += 20;
    matchedCriteria.push("Open to your field of study");
  } else if (!profile.fieldOfStudy.trim()) {
    addMissing("fieldOfStudy");
  } else {
    const field = profile.fieldOfStudy.toLowerCase();
    const hit = keywords.find((keyword) => field.includes(keyword.toLowerCase()));
    if (hit) {
      score += 20;
      matchedCriteria.push(`Field of study aligns (${hit})`);
    } else {
      failedCriteria.push(`Focuses on ${keywords.join(", ")}`);
    }
  }

  /* --- Mandatory profile evidence (20 pts, split across requirements) --- */
  const evidenceFields = requirements.requiredProfileFields.filter(
    (field) => field !== "gpa" && field !== "fieldOfStudy" && field !== "degreeLevel"
  );
  if (evidenceFields.length === 0) {
    score += 20;
  } else {
    const perField = 20 / evidenceFields.length;
    for (const field of evidenceFields) {
      if (isProfileFieldPresent(profile, field)) {
        score += perField;
        matchedCriteria.push(`${PROFILE_FIELD_LABELS[field]} provided`);
      } else {
        addMissing(field);
      }
    }
  }

  /* --- Status resolution (honesty rules first) --- */
  let percentage: number;
  let status: EligibilityResult["status"];

  if (hardFail) {
    status = "Not Eligible";
    percentage = Math.min(Math.round(score), 45);
  } else if (missingProfileInfo.length > 0) {
    // Never claim eligibility while mandatory information is missing.
    status = "Potential Match";
    percentage = Math.min(Math.round(score), 84);
  } else if (score >= 75) {
    status = "Eligible";
    percentage = Math.min(Math.round(score), 96);
  } else if (score >= 50) {
    status = "Potential Match";
    percentage = Math.round(score);
  } else {
    status = "Not Eligible";
    percentage = Math.round(score);
  }

  return {
    percentage,
    status,
    missingProfileInfo,
    matchedCriteria,
    failedCriteria,
    studentEducationLevel: studentLevel,
  };
}

/** Pre-computes eligibility for a list, keyed by scholarship id. */
export function buildEligibilityMap(
  profile: ScholarProfile,
  scholarships: Scholarship[]
): Map<string, EligibilityResult> {
  const map = new Map<string, EligibilityResult>();
  for (const scholarship of scholarships) {
    map.set(scholarship.id, calculateEligibility(profile, scholarship));
  }
  return map;
}
