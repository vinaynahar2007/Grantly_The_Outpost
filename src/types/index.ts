import type { LucideIcon } from "lucide-react";

export type AppRoutePath =
  | "/dashboard"
  | "/explore"
  | "/eligibility"
  | "/saved"
  | "/applications"
  | "/documents"
  | "/calendar"
  | "/profile";

export type NavSection = "overview" | "workspace" | "account";

export interface NavItem {
  id: string;
  label: string;
  path: AppRoutePath;
  icon: LucideIcon;
  section: NavSection;
  description: string;
}

export type ApplicationStatus =
  | "saved"
  | "preparing"
  | "submitted"
  | "under-review"
  | "shortlisted"
  | "awarded"
  | "rejected"
  | "withdrawn";

export type DashboardApplicationStatus =
  | "Saved"
  | "Preparing"
  | "Submitted"
  | "Under Review"
  | "Shortlisted"
  | "Awarded"
  | "Rejected"
  | "Withdrawn";

/* ------------------------------------------------------------------ */
/* Scholarship Explorer domain (Phase 3)                               */
/* ------------------------------------------------------------------ */

export type EducationLevel =
  | "Undergraduate"
  | "Postgraduate"
  | "Doctoral"
  | "Diploma"
  | "School";

export type ScholarshipCategory =
  | "Merit-Based"
  | "Need-Based"
  | "Government"
  | "Private"
  | "International"
  | "Research";

export type ScholarshipLocation = "National" | "State" | "International";

export type EligibilityStatus = "Eligible" | "Potential Match" | "Not Eligible";

export type ProfileFieldKey =
  | "fullName"
  | "email"
  | "institution"
  | "degreeLevel"
  | "fieldOfStudy"
  | "graduationYear"
  | "gpa"
  | "annualFamilyIncome"
  | "leadershipSummary";

export interface EligibilityRequirements {
  /** Minimum CGPA on a 10-point scale, when the scholarship states one. */
  minGpa?: number;
  /** Field-of-study keywords that count as relevant (empty = open to all fields). */
  acceptedFieldKeywords: string[];
  /** Profile fields that must be present before eligibility can be confirmed. */
  requiredProfileFields: ProfileFieldKey[];
}

export interface EligibilityResult {
  percentage: number;
  status: EligibilityStatus;
  /** Human labels of mandatory profile information that is still missing. */
  missingProfileInfo: string[];
  matchedCriteria: string[];
  failedCriteria: string[];
  studentEducationLevel: EducationLevel | null;
}

export interface ScholarshipImportantDate {
  label: string;
  date: string;
}

export interface Scholarship {
  id: string;
  title: string;
  provider: string;
  /** Longer overview used by Explorer search and the detail view. */
  description: string;
  /** Primary award figure used for amount filtering/sorting (= amountMax). */
  amount: number;
  amountMin: number;
  amountMax: number;
  currency: string;
  deadline: string;
  /** Legacy single-label level kept for Phase 2 dashboard components. */
  educationLevel: string;
  educationLevels: EducationLevel[];
  location: ScholarshipLocation;
  matchScore: number;
  category: ScholarshipCategory;
  eligibilitySummary: string;
  eligibilityCriteria: string[];
  eligibilityRequirements: EligibilityRequirements;
  /** Declarative rule set consumed by the Phase 4 matching engine. */
  matchRequirements: MatchRequirements;
  academicRequirements: string[];
  financialRequirements: string[];
  requiredDocuments: string[];
  benefits: string[];
  applicationSteps: string[];
  /** Only ever set when a verified official URL exists; demo data uses null. */
  officialUrl: string | null;
  providerDescription: string;
  importantDates: ScholarshipImportantDate[];
  dateAdded: string;
  keywords: string[];
  renewable: boolean;
  tags: string[];
  isDemo: true;
}

export type AmountRangeId =
  | "under-25000"
  | "25000-50000"
  | "50000-100000"
  | "100000-500000"
  | "above-500000";

export type EligibilityFilter =
  | "all"
  | "eligible"
  | "potential"
  | "not-eligible";

export type DeadlineFilter = "all" | "7" | "30" | "90";

export type ScholarshipSortOption =
  | "recommended"
  | "deadline-asc"
  | "amount-desc"
  | "amount-asc"
  | "recent";

export interface ExplorerFilters {
  educationLevels: EducationLevel[];
  categories: ScholarshipCategory[];
  amountRanges: AmountRangeId[];
  locations: ScholarshipLocation[];
  eligibility: EligibilityFilter;
  deadline: DeadlineFilter;
}

export interface ActiveFilterChip {
  id: string;
  group: keyof ExplorerFilters;
  value: string;
  label: string;
}

export type ScholarshipBadgeLabel =
  | "Best Match"
  | "Closing Soon"
  | "High Value"
  | "Government"
  | "International";

/* ------------------------------------------------------------------ */
/* Existing Phase 2 domain                                             */
/* ------------------------------------------------------------------ */

export interface ScholarshipApplication {
  id: string;
  scholarshipId: string;
  status: ApplicationStatus;
  /** Unknown legacy creation dates stay null, rather than being invented. */
  createdAt: string | null;
  submittedAt: string | null;
  updatedAt: string;
  notes: string;
  reminderDate: string | null;
  completedDocuments: string[];
  history: ApplicationHistoryEvent[];
}

export interface ApplicationHistoryEvent {
  id: string;
  type:
    | "created"
    | "status_changed"
    | "notes_updated"
    | "submission_updated"
    | "reminder_updated"
    | "documents_updated"
    | "imported";
  timestamp: string;
  description: string;
  fromStatus?: ApplicationStatus;
  toStatus?: ApplicationStatus;
}

export interface ApplicationUpdates {
  status?: ApplicationStatus;
  notes?: string;
  submittedAt?: string | null;
  reminderDate?: string | null;
  completedDocuments?: string[];
}

export interface TrackedApplication {
  application: ScholarshipApplication;
  scholarship: Scholarship;
}

export type ApplicationDeadlineFilter = "all" | "7" | "30" | "overdue";
export type ApplicationSort = "updated" | "deadline" | "amount";
export interface ApplicationFilters {
  query: string;
  status: "all" | "active" | "in-progress" | "completed" | ApplicationStatus;
  deadline: ApplicationDeadlineFilter;
  sort: ApplicationSort;
}

export interface ScholarDocument {
  id: string;
  name: string;
  category: "transcript" | "essay" | "recommendation" | "financial" | "other";
  updatedAt: string;
  status: "ready" | "draft";
}

export type DocumentCategory =
  | "transcript"
  | "identity"
  | "income"
  | "category-certificate"
  | "recommendation"
  | "personal-statement"
  | "other";

export type DocumentStatus =
  | "uploaded"
  | "pending-verification"
  | "verified"
  | "expired";

export interface VaultDocument {
  id: string;
  name: string;
  category: DocumentCategory;
  mimeType: string;
  size: number;
  updatedAt: string;
  status: DocumentStatus;
  expiresAt: string | null;
  associatedApplicationIds: string[];
}

export type CalendarEventType =
  | "scholarship-deadline"
  | "application-date"
  | "personal-reminder"
  | "document-reminder";

export interface PersonalCalendarReminder {
  id: string;
  title: string;
  date: string;
  notes: string;
  applicationId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEvent {
  id: string;
  type: CalendarEventType;
  title: string;
  date: string;
  scholarshipId: string | null;
  scholarshipTitle: string | null;
  applicationId: string | null;
  applicationStatus: ApplicationStatus | null;
  notes: string;
  readOnly: boolean;
}

export type CalendarEventFilter =
  | "all"
  | "scholarship-deadline"
  | "application-date"
  | "personal-reminder"
  | "document-reminder";

export type CalendarView = "month" | "week" | "agenda";

export type InstitutionType =
  | "Government"
  | "Government-Aided"
  | "Private"
  | "Deemed University";

export interface ScholarProfile {
  fullName: string;
  email: string;
  institution: string;
  degreeLevel: string;
  fieldOfStudy: string;
  graduationYear: number | null;
  gpa: string;
  annualFamilyIncome: string;
  leadershipSummary: string;
  /** Phase 4 — Smart Eligibility Matcher analysis fields. Empty = not provided. */
  age: number | null;
  state: string;
  country: string;
  nationality: string;
  institutionType: InstitutionType | "";
  academicYear: number | null;
  socialCategory: string;
  achievements: string;
  researchInterests: string;
  financialBackground: string;
}

export type DeadlineUrgency = "normal" | "attention" | "urgent" | "closed";

export interface DeadlineInfo {
  remainingDays: number;
  urgency: DeadlineUrgency;
  label: string;
  formattedDate: string;
}

export interface UpcomingDeadlineItem {
  id: string;
  scholarshipId: string;
  scholarshipTitle: string;
  provider: string;
  deadline: string;
  deadlineInfo: DeadlineInfo;
}

export type ActivityType =
  | "scholarship_saved"
  | "application_status_changed"
  | "profile_updated"
  | "document_uploaded";

export interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: string;
  isDemo: boolean;
}

export interface ProfileSectionStatus {
  id: string;
  label: string;
  completed: boolean;
  missingHint: string;
}

export interface ProfileCompletionResult {
  percentage: number;
  completedCount: number;
  totalCount: number;
  completedSections: ProfileSectionStatus[];
  missingSections: ProfileSectionStatus[];
}

export interface ApplicationStageSummary {
  status: DashboardApplicationStatus;
  count: number;
  percentage: number;
  color: string;
}

export interface DashboardMetrics {
  matchingCount: number;
  potentialFundingTotal: number;
  activeApplicationsCount: number;
  upcomingDeadlinesCount: number;
}

/* ------------------------------------------------------------------ */
/* Smart Eligibility Matcher (Phase 4)                                 */
/* ------------------------------------------------------------------ */

/** Profile fields the rule engine can analyse. */
export type MatcherProfileField =
  | "fullName"
  | "email"
  | "institution"
  | "institutionType"
  | "degreeLevel"
  | "fieldOfStudy"
  | "academicYear"
  | "graduationYear"
  | "gpa"
  | "age"
  | "state"
  | "country"
  | "nationality"
  | "annualFamilyIncome"
  | "financialBackground"
  | "socialCategory"
  | "achievements"
  | "researchInterests"
  | "leadershipSummary";

/** Declarative, scholarship-specific requirements consumed by the engine. */
export interface MatchRequirements {
  minGpa?: number;
  maxAnnualIncome?: number;
  minAge?: number;
  maxAge?: number;
  allowedCountries: string[];
  allowedStates: string[];
  allowedNationalities: string[];
  institutionTypes: InstitutionType[];
  academicYears: number[];
  socialCategories: string[];
  /** Mandatory field-of-study restriction (empty = open to all courses). */
  courseKeywords: string[];
  /** Preferred, non-blocking signals. */
  preferredCourseKeywords: string[];
  preferredAchievementKeywords: string[];
  preferredResearchKeywords: string[];
  /** Mandatory supporting evidence the student must supply. */
  evidenceFields: ProfileFieldKey[];
}

export type MatchCategory = "strong" | "potential" | "low" | "not-eligible";

export type CriterionState =
  | "satisfied"
  | "needs-information"
  | "failed"
  | "not-applicable";

export type CriterionKind = "mandatory" | "preferred";

export type CriterionGroup =
  | "education"
  | "academic"
  | "financial"
  | "location"
  | "course"
  | "personal"
  | "achievements"
  | "research";

export interface MatchCriterion {
  id: string;
  group: CriterionGroup;
  label: string;
  kind: CriterionKind;
  state: CriterionState;
  requirement: string;
  studentValue: string;
  explanation: string;
  /** Normalised share of the total score, in percentage points. */
  weight: number;
  points: number;
  profileField?: MatcherProfileField;
}

export interface ScholarshipMatch {
  scholarshipId: string;
  scholarship: Scholarship;
  score: number;
  category: MatchCategory;
  eligibilityStatus: EligibilityStatus;
  criteria: MatchCriterion[];
  matched: MatchCriterion[];
  missing: MatchCriterion[];
  failed: MatchCriterion[];
  unmetPreferred: MatchCriterion[];
  missingFields: MatcherProfileField[];
  applicableWeight: number;
  earnedPoints: number;
  explanation: string;
}

export interface MatchSummary {
  total: number;
  strong: number;
  potential: number;
  low: number;
  notEligible: number;
  /** Strong + potential + low — never includes a failed mandatory criterion. */
  matchingCount: number;
  averageScore: number;
  profileCompleteness: number;
  analyzedAt: string;
}

export interface MatcherProfileCompleteness {
  percentage: number;
  completedCount: number;
  totalCount: number;
  completedFields: MatcherProfileField[];
  missingFields: MatcherProfileField[];
}

export interface ProfileImprovement {
  id: string;
  field: MatcherProfileField;
  title: string;
  action: string;
  rationale: string;
  affectedScholarships: number;
  profileSection: "personal" | "education" | "financial" | "additional";
  /** Number of scholarships blocked on this field (mandatory impact). */
  priority: number;
}

export type MatchFilter = "all" | MatchCategory;

export type MatchSortOption = "score-desc" | "amount-desc" | "deadline-asc";
