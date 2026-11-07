import type {
  ApplicationStageSummary,
  DashboardMetrics,
  DeadlineInfo,
  DeadlineUrgency,
  ProfileCompletionResult,
  ProfileSectionStatus,
  ScholarProfile,
  Scholarship,
  ScholarshipApplication,
  UpcomingDeadlineItem,
} from "@/types";
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_ORDER,
  hasOnlyTerminalApplications,
  isActiveApplication,
} from "@/data/applicationStatuses";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Formats an INR currency figure cleanly using Indian numbering system (e.g., ₹8,50,000).
 */
export function formatINR(amount: number): string {
  const safeAmount = Number.isFinite(amount)
    ? Math.max(0, Math.round(amount))
    : 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(safeAmount);
}

/**
 * Formats an ISO date string into a clean human-readable date (e.g., "May 24, 2026").
 */
export function formatDisplayDate(isoDate: string): string {
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) {
    return "Date TBD";
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

/**
 * Formats a full editorial date for the welcome header (e.g., "Monday, May 18, 2026").
 */
export function formatWelcomeDate(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

/**
 * Extracts a clean first name from the scholar profile, falling back to "Alex".
 */
export function getScholarFirstName(fullName: string): string {
  const trimmed = fullName.trim();
  if (!trimmed) return "Alex";
  return trimmed.split(/\s+/)[0] || "Alex";
}

/**
 * Computes remaining days and urgency tier from a deadline ISO date and reference date.
 * Rules:
 * - remainingDays < 0 => "closed"
 * - 0 <= remainingDays < 7 => "urgent"
 * - 7 <= remainingDays <= 14 => "attention"
 * - remainingDays > 14 => "normal"
 */
export function evaluateDeadline(
  deadlineIso: string,
  referenceDate: Date = new Date(),
): DeadlineInfo {
  const target = new Date(deadlineIso);
  if (Number.isNaN(target.getTime())) {
    return {
      remainingDays: 0,
      urgency: "normal",
      label: "Normal",
      formattedDate: "Date TBD",
    };
  }

  const startOfToday = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
  );
  const startOfDeadline = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate(),
  );

  const remainingDays = Math.round(
    (startOfDeadline.getTime() - startOfToday.getTime()) / MS_PER_DAY,
  );

  let urgency: DeadlineUrgency;
  let label: string;

  if (remainingDays < 0) {
    urgency = "closed";
    label = "Closed";
  } else if (remainingDays < 7) {
    urgency = "urgent";
    label = "Urgent";
  } else if (remainingDays <= 14) {
    urgency = "attention";
    label = "Attention";
  } else {
    urgency = "normal";
    label = "Normal";
  }

  return {
    remainingDays,
    urgency,
    label,
    formattedDate: formatDisplayDate(deadlineIso),
  };
}

/**
 * Calculates profile completion percentage, completed sections, and missing hints
 * directly from actual ScholarProfile fields.
 */
export function calculateProfileCompletion(
  profile: ScholarProfile,
): ProfileCompletionResult {
  const sections: ProfileSectionStatus[] = [
    {
      id: "personal",
      label: "Personal & Contact Identity",
      completed: Boolean(profile.fullName.trim() && profile.email.trim()),
      missingHint: "Add your full name and primary academic email address",
    },
    {
      id: "institution",
      label: "Institution & Degree Level",
      completed: Boolean(
        profile.institution.trim() && profile.degreeLevel.trim(),
      ),
      missingHint: "Specify your current university and degree program",
    },
    {
      id: "field",
      label: "Field of Study & Graduation",
      completed: Boolean(
        profile.fieldOfStudy.trim() &&
          typeof profile.graduationYear === "number" &&
          profile.graduationYear >= 2024,
      ),
      missingHint: "Enter your academic major and expected graduation year",
    },
    {
      id: "academic_standing",
      label: "Academic Standing (GPA)",
      completed: Boolean(profile.gpa.trim()),
      missingHint: "Provide your current cumulative GPA or percentage",
    },
    {
      id: "financial",
      label: "Financial Eligibility Bracket",
      completed: Boolean(profile.annualFamilyIncome.trim()),
      missingHint: "Add household income bracket for need-based grant matching",
    },
    {
      id: "leadership",
      label: "Leadership & Research Summary",
      completed: Boolean(profile.leadershipSummary.trim().length >= 15),
      missingHint:
        "Summarize research, projects, or community leadership highlights",
    },
  ];

  const completedSections = sections.filter((s) => s.completed);
  const missingSections = sections.filter((s) => !s.completed);
  const percentage = Math.round(
    (completedSections.length / sections.length) * 100,
  );

  return {
    percentage,
    completedCount: completedSections.length,
    totalCount: sections.length,
    completedSections,
    missingSections,
  };
}

/**
 * Aggregates application counts and percentages across the four dashboard progress stages.
 */
export function summarizeApplicationProgress(
  applications: ScholarshipApplication[],
): ApplicationStageSummary[] {
  const total = applications.length;

  return APPLICATION_STATUS_ORDER.map((key) => {
    const { label: status, color } = APPLICATION_STATUSES[key];
    const count = applications.filter((app) => app.status === key).length;
    const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
    return {
      status,
      count,
      percentage,
      color,
    };
  });
}

/**
 * Builds chronologically sorted upcoming deadline records from scholarships.
 */
export function buildUpcomingDeadlines(
  scholarships: Scholarship[],
  referenceDate: Date = new Date(),
  applications: ScholarshipApplication[] = [],
): UpcomingDeadlineItem[] {
  return scholarships
    .filter(
      (scholarship) =>
        !hasOnlyTerminalApplications(scholarship.id, applications),
    )
    .map((scholarship) => ({
      id: `deadline-${scholarship.id}`,
      scholarshipId: scholarship.id,
      scholarshipTitle: scholarship.title,
      provider: scholarship.provider,
      deadline: scholarship.deadline,
      deadlineInfo: evaluateDeadline(scholarship.deadline, referenceDate),
    }))
    .sort((a, b) => {
      // Open deadlines sorted earliest first; closed deadlines placed after open ones
      if (a.deadlineInfo.remainingDays < 0 && b.deadlineInfo.remainingDays >= 0)
        return 1;
      if (a.deadlineInfo.remainingDays >= 0 && b.deadlineInfo.remainingDays < 0)
        return -1;
      return a.deadlineInfo.remainingDays - b.deadlineInfo.remainingDays;
    });
}

/**
 * Derives the four primary KPI metrics from centralized scholarship and application state.
 */
export function computeDashboardMetrics(
  scholarships: Scholarship[],
  applications: ScholarshipApplication[],
  referenceDate: Date = new Date(),
): DashboardMetrics {
  const matchingScholarships = scholarships.filter(
    (item) => item.matchScore >= 75,
  );
  const matchingCount = matchingScholarships.length;

  const potentialFundingTotal = matchingScholarships.reduce(
    (sum, item) => sum + item.amountMax,
    0,
  );

  const activeApplicationsCount = applications.filter((app) =>
    isActiveApplication(app.status),
  ).length;

  const upcomingDeadlinesCount = scholarships.filter((item) => {
    if (hasOnlyTerminalApplications(item.id, applications)) return false;
    const info = evaluateDeadline(item.deadline, referenceDate);
    return info.remainingDays >= 0 && info.remainingDays <= 30;
  }).length;

  return {
    matchingCount,
    potentialFundingTotal,
    activeApplicationsCount,
    upcomingDeadlinesCount,
  };
}
