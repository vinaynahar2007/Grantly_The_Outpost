import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useRef,
  type ReactNode,
} from "react";
import type {
  ActivityItem,
  ApplicationStatus,
  ApplicationUpdates,
  ApplicationStageSummary,
  DashboardMetrics,
  EligibilityResult,
  ProfileCompletionResult,
  ScholarProfile,
  Scholarship,
  ScholarshipApplication,
  UpcomingDeadlineItem,
} from "@/types";
import {
  APPLICATION_STATUSES,
  isActiveApplication,
} from "@/data/applicationStatuses";
import {
  createApplication,
  findActiveApplication,
  normalizeApplications,
  updateApplicationRecord,
  validateApplicationUpdates,
} from "@/utils/applicationLogic";
import { buildEligibilityMap } from "@/utils/eligibility";
import {
  createDemoActivities,
  createDemoApplications,
  createDemoScholarships,
  DEFAULT_SCHOLAR_PROFILE,
  INITIAL_SAVED_SCHOLARSHIP_IDS,
} from "@/data/scholarships";
import {
  buildUpcomingDeadlines,
  calculateProfileCompletion,
  computeDashboardMetrics,
  formatINR,
  summarizeApplicationProgress,
} from "@/utils/dashboardLogic";
import { storageService } from "@/services/storageService";
import { useToast } from "./ToastContext";

const STORAGE_KEYS = {
  savedIds: "saved_scholarships",
  profile: "scholar_profile",
  applications: "scholar_applications",
  activities: "scholar_activities",
  compareIds: "compare_scholarships",
} as const;

export const MAX_COMPARE_SELECTIONS = 3;

function sanitizeCompareIds(raw: unknown, validIds: Set<string>): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of raw) {
    if (
      typeof item === "string" &&
      validIds.has(item) &&
      !seen.has(item) &&
      result.length < MAX_COMPARE_SELECTIONS
    ) {
      seen.add(item);
      result.push(item);
    }
  }
  return result;
}

function sanitizeSavedIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return INITIAL_SAVED_SCHOLARSHIP_IDS;
  }
  return raw.filter(
    (item): item is string =>
      typeof item === "string" && item.trim().length > 0,
  );
}

function sanitizeProfile(raw: unknown): ScholarProfile {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return DEFAULT_SCHOLAR_PROFILE;
  }
  const candidate = raw as Record<string, unknown>;
  return {
    fullName:
      typeof candidate.fullName === "string"
        ? candidate.fullName
        : DEFAULT_SCHOLAR_PROFILE.fullName,
    email:
      typeof candidate.email === "string"
        ? candidate.email
        : DEFAULT_SCHOLAR_PROFILE.email,
    institution:
      typeof candidate.institution === "string"
        ? candidate.institution
        : DEFAULT_SCHOLAR_PROFILE.institution,
    degreeLevel:
      typeof candidate.degreeLevel === "string"
        ? candidate.degreeLevel
        : DEFAULT_SCHOLAR_PROFILE.degreeLevel,
    fieldOfStudy:
      typeof candidate.fieldOfStudy === "string"
        ? candidate.fieldOfStudy
        : DEFAULT_SCHOLAR_PROFILE.fieldOfStudy,
    graduationYear:
      typeof candidate.graduationYear === "number" &&
      Number.isFinite(candidate.graduationYear)
        ? candidate.graduationYear
        : candidate.graduationYear === null
          ? null
          : DEFAULT_SCHOLAR_PROFILE.graduationYear,
    gpa:
      typeof candidate.gpa === "string"
        ? candidate.gpa
        : DEFAULT_SCHOLAR_PROFILE.gpa,
    annualFamilyIncome:
      typeof candidate.annualFamilyIncome === "string"
        ? candidate.annualFamilyIncome
        : DEFAULT_SCHOLAR_PROFILE.annualFamilyIncome,
    leadershipSummary:
      typeof candidate.leadershipSummary === "string"
        ? candidate.leadershipSummary
        : DEFAULT_SCHOLAR_PROFILE.leadershipSummary,
    // Phase 4 matcher fields. Anything malformed falls back to the seeded
    // demo value; blank strings stay blank so nothing is ever assumed.
    age: readNullableNumber(candidate.age, DEFAULT_SCHOLAR_PROFILE.age),
    state: readString(candidate.state, DEFAULT_SCHOLAR_PROFILE.state),
    country: readString(candidate.country, DEFAULT_SCHOLAR_PROFILE.country),
    nationality: readString(
      candidate.nationality,
      DEFAULT_SCHOLAR_PROFILE.nationality,
    ),
    institutionType: readInstitutionType(candidate.institutionType),
    academicYear: readNullableNumber(
      candidate.academicYear,
      DEFAULT_SCHOLAR_PROFILE.academicYear,
    ),
    socialCategory: readString(
      candidate.socialCategory,
      DEFAULT_SCHOLAR_PROFILE.socialCategory,
    ),
    achievements: readString(
      candidate.achievements,
      DEFAULT_SCHOLAR_PROFILE.achievements,
    ),
    researchInterests: readString(
      candidate.researchInterests,
      DEFAULT_SCHOLAR_PROFILE.researchInterests,
    ),
    financialBackground: readString(
      candidate.financialBackground,
      DEFAULT_SCHOLAR_PROFILE.financialBackground,
    ),
  };
}

function readString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function readNullableNumber(
  value: unknown,
  fallback: number | null,
): number | null {
  if (value === null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (
    typeof value === "string" &&
    value.trim() !== "" &&
    Number.isFinite(Number(value))
  ) {
    return Number(value);
  }
  return fallback;
}

const INSTITUTION_TYPES = new Set([
  "Government",
  "Government-Aided",
  "Private",
  "Deemed University",
]);

function readInstitutionType(
  value: unknown,
): ScholarProfile["institutionType"] {
  return typeof value === "string" && INSTITUTION_TYPES.has(value)
    ? (value as ScholarProfile["institutionType"])
    : "";
}

function sanitizeActivities(
  raw: unknown,
  fallback: ActivityItem[],
): ActivityItem[] {
  if (!Array.isArray(raw)) {
    return fallback;
  }
  const validTypes = new Set([
    "scholarship_saved",
    "application_status_changed",
    "profile_updated",
    "document_uploaded",
  ]);

  const parsed = raw.filter((item): item is ActivityItem => {
    if (!item || typeof item !== "object") return false;
    const rec = item as Record<string, unknown>;
    return (
      typeof rec.id === "string" &&
      typeof rec.type === "string" &&
      validTypes.has(rec.type) &&
      typeof rec.title === "string" &&
      typeof rec.description === "string" &&
      typeof rec.timestamp === "string"
    );
  });

  return parsed.length > 0 ? parsed : fallback;
}

export interface StudentDataContextValue {
  scholarships: Scholarship[];
  savedIds: string[];
  savedScholarships: Scholarship[];
  applications: ScholarshipApplication[];
  profile: ScholarProfile;
  activities: ActivityItem[];
  metrics: DashboardMetrics;
  profileCompletion: ProfileCompletionResult;
  applicationProgress: ApplicationStageSummary[];
  upcomingDeadlines: UpcomingDeadlineItem[];
  eligibilityById: Map<string, EligibilityResult>;
  compareIds: string[];
  compareScholarships: Scholarship[];
  isScholarshipSaved: (scholarshipId: string) => boolean;
  toggleSaveScholarship: (scholarshipId: string) => void;
  isInCompare: (scholarshipId: string) => boolean;
  toggleCompareScholarship: (scholarshipId: string) => void;
  removeFromCompare: (scholarshipId: string) => void;
  clearCompare: () => void;
  updateProfile: (updates: Partial<ScholarProfile>) => void;
  startApplication: (
    scholarshipId: string,
    status?: "saved" | "preparing",
  ) => string | null;
  updateApplication: (
    applicationId: string,
    updates: ApplicationUpdates,
  ) => boolean;
  deleteApplication: (applicationId: string) => void;
  resetDemoData: () => void;
}

const StudentDataContext = createContext<StudentDataContextValue | null>(null);

export function StudentDataProvider({ children }: { children: ReactNode }) {
  const { showToast } = useToast();

  const [demoReferenceDate, setDemoReferenceDate] = useState(() => {
    const stored = storageService.get<unknown>("demo_reference_date", null);
    return typeof stored === "string" && Number.isFinite(Date.parse(stored))
      ? new Date(stored)
      : new Date();
  });
  const scholarships = useMemo(
    () => createDemoScholarships(demoReferenceDate),
    [demoReferenceDate],
  );
  useEffect(() => {
    // Persist only the demo clock, not duplicate scholarship records.
    storageService.set("demo_reference_date", demoReferenceDate.toISOString());
  }, [demoReferenceDate]);

  const [savedIds, setSavedIds] = useState<string[]>(() =>
    sanitizeSavedIds(
      storageService.get<unknown>(
        STORAGE_KEYS.savedIds,
        INITIAL_SAVED_SCHOLARSHIP_IDS,
      ),
    ),
  );

  const [profile, setProfile] = useState<ScholarProfile>(() =>
    sanitizeProfile(
      storageService.get<unknown>(
        STORAGE_KEYS.profile,
        DEFAULT_SCHOLAR_PROFILE,
      ),
    ),
  );

  const [applications, setApplications] = useState<ScholarshipApplication[]>(
    () => {
      const defaults = createDemoApplications();
      return normalizeApplications(
        storageService.get<unknown>(STORAGE_KEYS.applications, defaults),
        defaults,
        scholarships,
      );
    },
  );

  const applicationsRef = useRef(applications);
  applicationsRef.current = applications;

  const [activities, setActivities] = useState<ActivityItem[]>(() => {
    const defaults = createDemoActivities();
    return sanitizeActivities(
      storageService.get<unknown>(STORAGE_KEYS.activities, defaults),
      defaults,
    );
  });

  const scholarshipIdSet = useMemo(
    () => new Set(scholarships.map((item) => item.id)),
    [scholarships],
  );

  const [compareIds, setCompareIds] = useState<string[]>(() =>
    sanitizeCompareIds(
      storageService.get<unknown>(STORAGE_KEYS.compareIds, []),
      new Set(createDemoScholarships().map((item) => item.id)),
    ),
  );

  useEffect(() => {
    storageService.set(STORAGE_KEYS.compareIds, compareIds);
  }, [compareIds]);

  useEffect(() => {
    storageService.set(STORAGE_KEYS.savedIds, savedIds);
  }, [savedIds]);

  useEffect(() => {
    storageService.set(STORAGE_KEYS.profile, profile);
  }, [profile]);

  useEffect(() => {
    if (!storageService.set(STORAGE_KEYS.applications, applications)) {
      showToast({
        title: "Browser storage unavailable",
        description:
          "Your changes work for this session, but cannot survive a refresh.",
        tone: "error",
      });
    }
  }, [applications, showToast]);

  useEffect(() => {
    storageService.set(STORAGE_KEYS.activities, activities);
  }, [activities]);

  const savedIdSet = useMemo(() => new Set(savedIds), [savedIds]);

  const isScholarshipSaved = useCallback(
    (scholarshipId: string) => savedIdSet.has(scholarshipId),
    [savedIdSet],
  );

  const compareIdSet = useMemo(() => new Set(compareIds), [compareIds]);

  const isInCompare = useCallback(
    (scholarshipId: string) => compareIdSet.has(scholarshipId),
    [compareIdSet],
  );

  const toggleCompareScholarship = useCallback(
    (scholarshipId: string) => {
      const target = scholarships.find((s) => s.id === scholarshipId);
      if (!target) return;

      if (compareIdSet.has(scholarshipId)) {
        setCompareIds((prev) => prev.filter((id) => id !== scholarshipId));
        showToast({
          title: "Removed from Compare",
          description: `${target.title} removed from comparison.`,
          tone: "info",
        });
        return;
      }

      if (compareIds.length >= MAX_COMPARE_SELECTIONS) {
        showToast({
          title: "Compare Limit Reached",
          description: `You can compare up to ${MAX_COMPARE_SELECTIONS} scholarships. Remove one to add another.`,
          tone: "info",
        });
        return;
      }

      setCompareIds((prev) => [...prev, scholarshipId]);
      showToast({
        title: "Added to Compare",
        description: `${target.title} added to comparison (${compareIds.length + 1}/${MAX_COMPARE_SELECTIONS}).`,
        tone: "info",
      });
    },
    [scholarships, compareIdSet, compareIds.length, showToast],
  );

  const removeFromCompare = useCallback((scholarshipId: string) => {
    setCompareIds((prev) => prev.filter((id) => id !== scholarshipId));
  }, []);

  const clearCompare = useCallback(() => {
    setCompareIds([]);
    showToast({
      title: "Comparison Cleared",
      description: "All scholarships removed from comparison.",
      tone: "info",
    });
  }, [showToast]);

  const toggleSaveScholarship = useCallback(
    (scholarshipId: string) => {
      const target = scholarships.find((s) => s.id === scholarshipId);
      if (!target) return;

      const currentlySaved = savedIdSet.has(scholarshipId);

      setSavedIds((prev) =>
        currentlySaved
          ? prev.filter((id) => id !== scholarshipId)
          : [scholarshipId, ...prev],
      );

      if (!currentlySaved) {
        const newActivity: ActivityItem = {
          id: `act-${Date.now()}`,
          type: "scholarship_saved",
          title: "Scholarship saved to shortlist",
          description: `Bookmarked ${target.title} (${formatINR(target.amountMax)}).`,
          timestamp: new Date().toISOString(),
          isDemo: true,
        };
        setActivities((prev) => [newActivity, ...prev.slice(0, 7)]);

        showToast({
          title: "Scholarship Saved",
          description: `${target.title} added to your shortlist.`,
          tone: "bookmark",
        });
      } else {
        showToast({
          title: "Removed from Saved",
          description: `${target.title} removed from your shortlist.`,
          tone: "info",
        });
      }
    },
    [scholarships, savedIdSet, showToast],
  );

  const updateProfile = useCallback(
    (updates: Partial<ScholarProfile>) => {
      setProfile((prev) => ({
        ...prev,
        ...updates,
      }));

      const newActivity: ActivityItem = {
        id: `act-${Date.now()}`,
        type: "profile_updated",
        title: "Scholar profile updated",
        description:
          "Updated academic profile details and recalculated match readiness.",
        timestamp: new Date().toISOString(),
        isDemo: true,
      };
      setActivities((prev) => [newActivity, ...prev.slice(0, 7)]);

      showToast({
        title: "Profile Updated",
        description:
          "Your scholar profile and completion score have been saved.",
        tone: "success",
      });
    },
    [showToast],
  );

  const commitApplications = useCallback((next: ScholarshipApplication[]) => {
    applicationsRef.current = next;
    setApplications(next);
  }, []);

  const addApplicationActivity = useCallback(
    (scholarship: Scholarship, title: string) => {
      setActivities((prev) => [
        {
          id: `activity-${globalThis.crypto.randomUUID()}`,
          type: "application_status_changed" as const,
          title,
          description: scholarship.title,
          timestamp: new Date().toISOString(),
          isDemo: true,
        },
        ...prev.slice(0, 7),
      ]);
    },
    [],
  );

  const startApplication = useCallback(
    (scholarshipId: string, status: "saved" | "preparing" = "preparing") => {
      const scholarship = scholarships.find(
        (item) => item.id === scholarshipId,
      );
      if (!scholarship) {
        showToast({
          title: "Scholarship unavailable",
          description: "Choose an existing scholarship.",
          tone: "error",
        });
        return null;
      }
      const existing = findActiveApplication(
        applicationsRef.current,
        scholarshipId,
      );
      if (existing) {
        showToast({
          title: "Application Already Tracked",
          description: `This scholarship is already ${APPLICATION_STATUSES[existing.status].label.toLowerCase()}.`,
          tone: "error",
        });
        return null;
      }
      const record = createApplication(scholarshipId, status);
      commitApplications([record, ...applicationsRef.current]);
      addApplicationActivity(
        scholarship,
        `Application added as ${APPLICATION_STATUSES[status].label}`,
      );
      showToast({
        title: "Application Tracked",
        description: `${scholarship.title} added to your tracker.`,
        tone: "success",
      });
      return record.id;
    },
    [scholarships, commitApplications, addApplicationActivity, showToast],
  );

  const updateApplication = useCallback(
    (applicationId: string, updates: ApplicationUpdates) => {
      const current = applicationsRef.current.find(
        (item) => item.id === applicationId,
      );
      const scholarship = scholarships.find(
        (item) => item.id === current?.scholarshipId,
      );
      if (!current || !scholarship) {
        showToast({
          title: "Application not found",
          description: "This record is no longer available.",
          tone: "error",
        });
        return false;
      }
      const error = validateApplicationUpdates(updates);
      if (error) {
        showToast({
          title: "Changes not saved",
          description: error,
          tone: "error",
        });
        return false;
      }
      const status: ApplicationStatus = updates.status ?? current.status;
      if (
        isActiveApplication(status) &&
        findActiveApplication(
          applicationsRef.current,
          scholarship.id,
          applicationId,
        )
      ) {
        showToast({
          title: "An active application already exists",
          description: "Close the other application before reopening this one.",
          tone: "error",
        });
        return false;
      }
      const safeUpdates = {
        ...updates,
        ...(updates.completedDocuments
          ? {
              completedDocuments: [
                ...new Set(
                  updates.completedDocuments.filter((doc) =>
                    scholarship.requiredDocuments.includes(doc),
                  ),
                ),
              ],
            }
          : {}),
      };
      const next = updateApplicationRecord(current, safeUpdates);
      if (next === current) {
        showToast({ title: "No changes to save", tone: "info" });
        return true;
      }
      commitApplications(
        applicationsRef.current.map((item) =>
          item.id === applicationId ? next : item,
        ),
      );
      const statusChanged = next.status !== current.status;
      addApplicationActivity(
        scholarship,
        statusChanged
          ? `Application moved to ${APPLICATION_STATUSES[next.status].label}`
          : "Application details updated",
      );
      showToast({
        title: statusChanged
          ? `Status updated to ${APPLICATION_STATUSES[next.status].label}`
          : "Application saved",
        description: "Your changes and history have been recorded.",
        tone: "success",
      });
      return true;
    },
    [scholarships, commitApplications, addApplicationActivity, showToast],
  );

  const deleteApplication = useCallback(
    (applicationId: string) => {
      commitApplications(
        applicationsRef.current.filter((item) => item.id !== applicationId),
      );
      showToast({
        title: "Application deleted",
        description: "Your scholarship bookmarks are unchanged.",
        tone: "info",
      });
    },
    [commitApplications, showToast],
  );

  const resetDemoData = useCallback(() => {
    setDemoReferenceDate(new Date());
    setSavedIds(INITIAL_SAVED_SCHOLARSHIP_IDS);
    setProfile(DEFAULT_SCHOLAR_PROFILE);
    commitApplications(createDemoApplications());
    setActivities(createDemoActivities());
    setCompareIds([]);
    showToast({
      title: "Demo Workspace Reset",
      description:
        "Restored initial demonstration profile and scholarship state.",
      tone: "info",
    });
  }, [showToast, commitApplications]);

  const savedScholarships = useMemo(
    () => scholarships.filter((item) => savedIdSet.has(item.id)),
    [scholarships, savedIdSet],
  );

  const metrics = useMemo(
    () => computeDashboardMetrics(scholarships, applications),
    [scholarships, applications],
  );

  const profileCompletion = useMemo(
    () => calculateProfileCompletion(profile),
    [profile],
  );

  const applicationProgress = useMemo(
    () => summarizeApplicationProgress(applications),
    [applications],
  );

  const upcomingDeadlines = useMemo(
    () => buildUpcomingDeadlines(scholarships, new Date(), applications),
    [scholarships, applications],
  );

  const eligibilityById = useMemo(
    () => buildEligibilityMap(profile, scholarships),
    [profile, scholarships],
  );

  const compareScholarships = useMemo(
    () =>
      compareIds
        .map((id) => scholarships.find((item) => item.id === id))
        .filter((item): item is Scholarship =>
          Boolean(item && scholarshipIdSet.has(item.id)),
        ),
    [compareIds, scholarships, scholarshipIdSet],
  );

  const value = useMemo<StudentDataContextValue>(
    () => ({
      scholarships,
      savedIds,
      savedScholarships,
      applications,
      profile,
      activities,
      metrics,
      profileCompletion,
      applicationProgress,
      upcomingDeadlines,
      eligibilityById,
      compareIds,
      compareScholarships,
      isScholarshipSaved,
      toggleSaveScholarship,
      isInCompare,
      toggleCompareScholarship,
      removeFromCompare,
      clearCompare,
      updateProfile,
      startApplication,
      updateApplication,
      deleteApplication,
      resetDemoData,
    }),
    [
      scholarships,
      savedIds,
      savedScholarships,
      applications,
      profile,
      activities,
      metrics,
      profileCompletion,
      applicationProgress,
      upcomingDeadlines,
      eligibilityById,
      compareIds,
      compareScholarships,
      isScholarshipSaved,
      toggleSaveScholarship,
      isInCompare,
      toggleCompareScholarship,
      removeFromCompare,
      clearCompare,
      updateProfile,
      startApplication,
      updateApplication,
      deleteApplication,
      resetDemoData,
    ],
  );

  return (
    <StudentDataContext.Provider value={value}>
      {children}
    </StudentDataContext.Provider>
  );
}

export function useStudentData(): StudentDataContextValue {
  const ctx = useContext(StudentDataContext);
  if (!ctx) {
    throw new Error("useStudentData must be used within a StudentDataProvider");
  }
  return ctx;
}
