import type {
  ActiveFilterChip,
  AmountRangeId,
  EducationLevel,
  EligibilityResult,
  ExplorerFilters,
  Scholarship,
  ScholarshipBadgeLabel,
  ScholarshipCategory,
  ScholarshipLocation,
  ScholarshipSortOption,
} from "@/types";
import { evaluateDeadline, formatINR } from "@/utils/dashboardLogic";

/**
 * Pure search / filter / sort / badge utilities for the Scholarship
 * Explorer. All logic lives outside React components so it can be unit
 * tested and reused by Dashboard, Saved and Compare views.
 */

export const EMPTY_EXPLORER_FILTERS: ExplorerFilters = {
  educationLevels: [],
  categories: [],
  amountRanges: [],
  locations: [],
  eligibility: "all",
  deadline: "all",
};

export const EDUCATION_LEVEL_OPTIONS: EducationLevel[] = [
  "Undergraduate",
  "Postgraduate",
  "Doctoral",
  "Diploma",
  "School",
];

export const CATEGORY_OPTIONS: ScholarshipCategory[] = [
  "Merit-Based",
  "Need-Based",
  "Government",
  "Private",
  "International",
  "Research",
];

export const LOCATION_OPTIONS: ScholarshipLocation[] = [
  "National",
  "State",
  "International",
];

export interface AmountRange {
  id: AmountRangeId;
  label: string;
  matches: (amount: number) => boolean;
}

export const AMOUNT_RANGES: AmountRange[] = [
  { id: "under-25000", label: "Under ₹25,000", matches: (a) => a < 25000 },
  { id: "25000-50000", label: "₹25,000–₹50,000", matches: (a) => a >= 25000 && a <= 50000 },
  {
    id: "50000-100000",
    label: "₹50,000–₹1,00,000",
    matches: (a) => a > 50000 && a <= 100000,
  },
  {
    id: "100000-500000",
    label: "₹1,00,000–₹5,00,000",
    matches: (a) => a > 100000 && a <= 500000,
  },
  { id: "above-500000", label: "Above ₹5,00,000", matches: (a) => a > 500000 },
];

export const SORT_OPTIONS: Array<{ value: ScholarshipSortOption; label: string }> = [
  { value: "recommended", label: "Recommended" },
  { value: "deadline-asc", label: "Deadline: Soonest first" },
  { value: "amount-desc", label: "Award amount: Highest first" },
  { value: "amount-asc", label: "Award amount: Lowest first" },
  { value: "recent", label: "Recently added" },
];

export function amountRangeLabel(id: AmountRangeId): string {
  return AMOUNT_RANGES.find((range) => range.id === id)?.label ?? id;
}

/** Live search across name, provider, description, category, levels & keywords. */
export function searchScholarships(
  scholarships: Scholarship[],
  query: string
): Scholarship[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return scholarships;
  const terms = normalized.split(/\s+/);

  return scholarships.filter((scholarship) => {
    const haystack = [
      scholarship.title,
      scholarship.provider,
      scholarship.description,
      scholarship.eligibilitySummary,
      scholarship.category,
      scholarship.location,
      scholarship.educationLevel,
      scholarship.educationLevels.join(" "),
      scholarship.tags.join(" "),
      scholarship.keywords.join(" "),
    ]
      .join(" ")
      .toLowerCase();

    return terms.every((term) => haystack.includes(term));
  });
}

/**
 * Applies all active filters together using AND logic. A scholarship must
 * satisfy every selected group (and at least one option inside a group).
 */
export function filterScholarships(
  scholarships: Scholarship[],
  filters: ExplorerFilters,
  eligibilityById: Map<string, EligibilityResult>,
  referenceDate: Date = new Date()
): Scholarship[] {
  return scholarships.filter((scholarship) => {
    if (
      filters.educationLevels.length > 0 &&
      !filters.educationLevels.some((level) => scholarship.educationLevels.includes(level))
    ) {
      return false;
    }

    if (filters.categories.length > 0 && !filters.categories.includes(scholarship.category)) {
      return false;
    }

    if (filters.amountRanges.length > 0) {
      const inRange = filters.amountRanges.some((rangeId) =>
        AMOUNT_RANGES.find((range) => range.id === rangeId)?.matches(scholarship.amount)
      );
      if (!inRange) return false;
    }

    if (filters.locations.length > 0 && !filters.locations.includes(scholarship.location)) {
      return false;
    }

    if (filters.eligibility !== "all") {
      const result = eligibilityById.get(scholarship.id);
      if (!result) return false;
      if (filters.eligibility === "eligible" && result.status !== "Eligible") return false;
      if (filters.eligibility === "potential" && result.status !== "Potential Match") {
        return false;
      }
      if (filters.eligibility === "not-eligible" && result.status !== "Not Eligible") {
        return false;
      }
    }

    if (filters.deadline !== "all") {
      const windowDays = Number(filters.deadline);
      const { remainingDays } = evaluateDeadline(scholarship.deadline, referenceDate);
      if (remainingDays < 0 || remainingDays > windowDays) return false;
    }

    return true;
  });
}

/** Sorts a copy of the list — never mutates the source array. */
export function sortScholarships(
  scholarships: Scholarship[],
  sort: ScholarshipSortOption,
  eligibilityById: Map<string, EligibilityResult>,
  referenceDate: Date = new Date()
): Scholarship[] {
  const sorted = [...scholarships];

  switch (sort) {
    case "deadline-asc":
      return sorted.sort((a, b) => {
        const ra = evaluateDeadline(a.deadline, referenceDate).remainingDays;
        const rb = evaluateDeadline(b.deadline, referenceDate).remainingDays;
        const rankA = ra < 0 ? Number.MAX_SAFE_INTEGER : ra;
        const rankB = rb < 0 ? Number.MAX_SAFE_INTEGER : rb;
        if (rankA !== rankB) return rankA - rankB;
        return a.title.localeCompare(b.title);
      });
    case "amount-desc":
      return sorted.sort((a, b) => b.amount - a.amount);
    case "amount-asc":
      return sorted.sort((a, b) => a.amount - b.amount);
    case "recent":
      return sorted.sort(
        (a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime()
      );
    case "recommended":
    default:
      return sorted.sort((a, b) => {
        const pctA = eligibilityById.get(a.id)?.percentage ?? a.matchScore;
        const pctB = eligibilityById.get(b.id)?.percentage ?? b.matchScore;
        if (pctB !== pctA) return pctB - pctA;
        if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
        return (
          evaluateDeadline(a.deadline, referenceDate).remainingDays -
          evaluateDeadline(b.deadline, referenceDate).remainingDays
        );
      });
  }
}

/** Full Explorer pipeline: search → filter (AND) → sort. */
export function applyExplorerQuery(
  scholarships: Scholarship[],
  query: string,
  filters: ExplorerFilters,
  sort: ScholarshipSortOption,
  eligibilityById: Map<string, EligibilityResult>,
  referenceDate: Date = new Date()
): Scholarship[] {
  const searched = searchScholarships(scholarships, query);
  const filtered = filterScholarships(searched, filters, eligibilityById, referenceDate);
  return sortScholarships(filtered, sort, eligibilityById, referenceDate);
}

export function countActiveFilters(filters: ExplorerFilters): number {
  return (
    filters.educationLevels.length +
    filters.categories.length +
    filters.amountRanges.length +
    filters.locations.length +
    (filters.eligibility !== "all" ? 1 : 0) +
    (filters.deadline !== "all" ? 1 : 0)
  );
}

export function hasActiveFilters(filters: ExplorerFilters): boolean {
  return countActiveFilters(filters) > 0;
}

/** Builds the removable chip list for every active filter selection. */
export function buildActiveFilterChips(filters: ExplorerFilters): ActiveFilterChip[] {
  const chips: ActiveFilterChip[] = [];

  for (const level of filters.educationLevels) {
    chips.push({ id: `education-${level}`, group: "educationLevels", value: level, label: level });
  }
  for (const category of filters.categories) {
    chips.push({
      id: `category-${category}`,
      group: "categories",
      value: category,
      label: category,
    });
  }
  for (const rangeId of filters.amountRanges) {
    chips.push({
      id: `amount-${rangeId}`,
      group: "amountRanges",
      value: rangeId,
      label: amountRangeLabel(rangeId),
    });
  }
  for (const location of filters.locations) {
    chips.push({
      id: `location-${location}`,
      group: "locations",
      value: location,
      label: `${location} scholarships`,
    });
  }
  if (filters.eligibility !== "all") {
    const label =
      filters.eligibility === "eligible"
        ? "Matching my profile"
        : filters.eligibility === "potential"
          ? "Potentially matching"
          : "Not matching";
    chips.push({ id: "eligibility", group: "eligibility", value: filters.eligibility, label });
  }
  if (filters.deadline !== "all") {
    chips.push({
      id: "deadline",
      group: "deadline",
      value: filters.deadline,
      label: `Closing within ${filters.deadline} days`,
    });
  }

  return chips;
}

/** Returns a new filters object with one chip's selection removed. */
export function removeFilterChip(
  filters: ExplorerFilters,
  chip: ActiveFilterChip
): ExplorerFilters {
  switch (chip.group) {
    case "educationLevels":
      return {
        ...filters,
        educationLevels: filters.educationLevels.filter((v) => v !== chip.value),
      };
    case "categories":
      return {
        ...filters,
        categories: filters.categories.filter((v) => v !== chip.value),
      };
    case "amountRanges":
      return {
        ...filters,
        amountRanges: filters.amountRanges.filter((v) => v !== chip.value),
      };
    case "locations":
      return {
        ...filters,
        locations: filters.locations.filter((v) => v !== chip.value),
      };
    case "eligibility":
      return { ...filters, eligibility: "all" };
    case "deadline":
      return { ...filters, deadline: "all" };
    default:
      return filters;
  }
}

/**
 * Derives display badges strictly from underlying data — a badge is only
 * shown when the record actually justifies it.
 */
export function getScholarshipBadges(
  scholarship: Scholarship,
  eligibility: EligibilityResult | undefined,
  referenceDate: Date = new Date()
): ScholarshipBadgeLabel[] {
  const badges: ScholarshipBadgeLabel[] = [];
  const { remainingDays } = evaluateDeadline(scholarship.deadline, referenceDate);

  if (eligibility && eligibility.status === "Eligible" && eligibility.percentage >= 90) {
    badges.push("Best Match");
  }
  if (remainingDays >= 0 && remainingDays <= 7) {
    badges.push("Closing Soon");
  }
  if (scholarship.amount >= 500000) {
    badges.push("High Value");
  }
  if (scholarship.category === "Government") {
    badges.push("Government");
  }
  if (scholarship.location === "International" || scholarship.category === "International") {
    badges.push("International");
  }

  return badges;
}

export function formatAmountRange(scholarship: Scholarship): string {
  if (scholarship.amountMin === scholarship.amountMax) {
    return formatINR(scholarship.amountMax);
  }
  return `${formatINR(scholarship.amountMin)} – ${formatINR(scholarship.amountMax)}`;
}
