import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  GraduationCap,
  Landmark,
  RotateCcw,
  Save,
  ScanSearch,
  Sparkles,
  UserCircle,
} from "lucide-react";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useStudentData } from "@/context/StudentDataContext";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { ProfileCompletionCard } from "@/components/dashboard/ProfileCompletionCard";
import { Button, Card } from "@/components/ui";
import { MatchRing } from "@/components/eligibility";
import { analyzeScholarships } from "@/services/matchingEngine";
import type { InstitutionType, ScholarProfile } from "@/types";

const INSTITUTION_TYPES: InstitutionType[] = [
  "Government",
  "Government-Aided",
  "Private",
  "Deemed University",
];

const inputClass =
  "w-full rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-2.5 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:border-[#7C3AED] focus:outline-none";
const labelClass = "block text-xs font-semibold text-[#334155]";

function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      {children}
      {hint && <p className="text-[11px] leading-relaxed text-[#64748B]">{hint}</p>}
    </div>
  );
}

function SectionCard({
  id,
  title,
  description,
  icon: Icon,
  children,
}: {
  id: string;
  title: string;
  description: string;
  icon: typeof UserCircle;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className="scroll-mt-28 rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-[0_1px_2px_0_rgb(15_23_42_/_0.04)] sm:p-6"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#DDD6FE] bg-[#F5F3FF] text-[#6D28D9]">
          <Icon className="h-4.5 w-4.5" aria-hidden="true" />
        </span>
        <div>
          <h2
            id={`${id}-heading`}
            className="font-display text-base font-semibold text-[#0F172A]"
          >
            {title}
          </h2>
          <p className="mt-0.5 text-xs leading-relaxed text-[#64748B]">{description}</p>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function ProfilePage() {
  useDocumentTitle("Scholar Profile");

  const location = useLocation();
  const { profile, profileCompletion, scholarships, updateProfile, resetDemoData } =
    useStudentData();
  const [formState, setFormState] = useState<ScholarProfile>(profile);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setFormState(profile);
  }, [profile]);

  // Deep links from "Improve Your Match" land on the relevant section.
  useEffect(() => {
    const hash = location.hash.replace("#", "");
    if (!hash) return;
    const target = document.getElementById(hash);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    const focusable = target.querySelector<HTMLElement>("input, select, textarea");
    window.setTimeout(() => focusable?.focus({ preventScroll: true }), 320);
  }, [location.hash]);

  const preview = useMemo(
    () => analyzeScholarships(formState, scholarships),
    [formState, scholarships]
  );

  const isDirty = useMemo(
    () => JSON.stringify(formState) !== JSON.stringify(profile),
    [formState, profile]
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateProfile(formState);
  };

  const setField = <K extends keyof ScholarProfile>(key: K, value: ScholarProfile[K]) =>
    setFormState((prev) => ({ ...prev, [key]: value }));

  return (
    <div ref={containerRef}>
      <PageHeader
        title="Scholar Profile"
        badgeText="Account"
        description="Everything the Smart Eligibility Matcher knows about you. Blank fields are treated as missing information — GRANTLY never assumes a value."
        actions={
          <>
            <Link to="/eligibility">
              <Button
                variant="secondary"
                size="md"
                leftIcon={<ScanSearch className="h-4 w-4 text-[#6D28D9]" aria-hidden="true" />}
              >
                Smart Match
              </Button>
            </Link>
            <Link to="/dashboard">
              <Button
                variant="ghost"
                size="md"
                leftIcon={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}
              >
                Dashboard
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="md"
              onClick={resetDemoData}
              leftIcon={<RotateCcw className="h-4 w-4" aria-hidden="true" />}
            >
              Reset Demo
            </Button>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-12">
        <form
          onSubmit={handleSubmit}
          className="space-y-5 xl:col-span-8"
          aria-label="Scholar Profile Form"
        >
          <SectionCard
            id="personal"
            title="Personal information"
            description="Used for age restrictions, domicile rules and nationality-based awards."
            icon={UserCircle}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="profile-fullName" label="Full Name">
                <input
                  id="profile-fullName"
                  type="text"
                  value={formState.fullName}
                  onChange={(e) => setField("fullName", e.target.value)}
                  placeholder="Alex Verma"
                  className={inputClass}
                />
              </Field>

              <Field id="profile-email" label="Academic Email">
                <input
                  id="profile-email"
                  type="email"
                  value={formState.email}
                  onChange={(e) => setField("email", e.target.value)}
                  placeholder="alex.verma@university.edu"
                  className={inputClass}
                />
              </Field>

              <Field id="profile-age" label="Age" hint="Only used where an award states an age limit.">
                <input
                  id="profile-age"
                  type="number"
                  min={10}
                  max={80}
                  value={formState.age ?? ""}
                  onChange={(e) => setField("age", e.target.value ? Number(e.target.value) : null)}
                  placeholder="Not provided"
                  className={inputClass}
                />
              </Field>

              <Field id="profile-nationality" label="Nationality">
                <input
                  id="profile-nationality"
                  type="text"
                  value={formState.nationality}
                  onChange={(e) => setField("nationality", e.target.value)}
                  placeholder="e.g., Indian"
                  className={inputClass}
                />
              </Field>

              <Field id="profile-country" label="Country of residence">
                <input
                  id="profile-country"
                  type="text"
                  value={formState.country}
                  onChange={(e) => setField("country", e.target.value)}
                  placeholder="e.g., India"
                  className={inputClass}
                />
              </Field>

              <Field id="profile-state" label="State / domicile">
                <input
                  id="profile-state"
                  type="text"
                  value={formState.state}
                  onChange={(e) => setField("state", e.target.value)}
                  placeholder="e.g., Maharashtra"
                  className={inputClass}
                />
              </Field>
            </div>
          </SectionCard>

          <SectionCard
            id="education"
            title="Education"
            description="Education level, course, institution type, year of study and academic score."
            icon={GraduationCap}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="profile-institution" label="Institution / University">
                <input
                  id="profile-institution"
                  type="text"
                  value={formState.institution}
                  onChange={(e) => setField("institution", e.target.value)}
                  placeholder="Indian Institute of Technology Bombay"
                  className={inputClass}
                />
              </Field>

              <Field id="profile-institutionType" label="Institution type">
                <select
                  id="profile-institutionType"
                  value={formState.institutionType}
                  onChange={(e) =>
                    setField("institutionType", e.target.value as ScholarProfile["institutionType"])
                  }
                  className={inputClass}
                >
                  <option value="">Not provided</option>
                  {INSTITUTION_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </Field>

              <Field id="profile-degreeLevel" label="Degree Level">
                <input
                  id="profile-degreeLevel"
                  type="text"
                  value={formState.degreeLevel}
                  onChange={(e) => setField("degreeLevel", e.target.value)}
                  placeholder="B.Tech Undergraduate"
                  className={inputClass}
                />
              </Field>

              <Field id="profile-fieldOfStudy" label="Field of Study">
                <input
                  id="profile-fieldOfStudy"
                  type="text"
                  value={formState.fieldOfStudy}
                  onChange={(e) => setField("fieldOfStudy", e.target.value)}
                  placeholder="Computer Science & Engineering"
                  className={inputClass}
                />
              </Field>

              <Field id="profile-academicYear" label="Current academic year">
                <select
                  id="profile-academicYear"
                  value={formState.academicYear ?? ""}
                  onChange={(e) =>
                    setField("academicYear", e.target.value ? Number(e.target.value) : null)
                  }
                  className={inputClass}
                >
                  <option value="">Not provided</option>
                  {[1, 2, 3, 4, 5, 6].map((year) => (
                    <option key={year} value={year}>
                      Year {year}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field id="profile-graduationYear" label="Graduation Year">
                  <input
                    id="profile-graduationYear"
                    type="number"
                    min={2024}
                    max={2035}
                    value={formState.graduationYear ?? ""}
                    onChange={(e) =>
                      setField("graduationYear", e.target.value ? Number(e.target.value) : null)
                    }
                    placeholder="2027"
                    className={inputClass}
                  />
                </Field>

                <Field id="profile-gpa" label="GPA / CGPA">
                  <input
                    id="profile-gpa"
                    type="text"
                    value={formState.gpa}
                    onChange={(e) => setField("gpa", e.target.value)}
                    placeholder="8.9 / 10.0 CGPA"
                    className={inputClass}
                  />
                </Field>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            id="financial"
            title="Financial information"
            description="Only used for need-based awards that state an income ceiling."
            icon={Landmark}
          >
            <div className="space-y-4">
              <Field
                id="profile-income"
                label="Annual Household Income Bracket (for Merit-cum-Means Grants)"
                hint="Enter a figure such as “Under ₹8,00,000 per annum” or “6 lakh”."
              >
                <input
                  id="profile-income"
                  type="text"
                  value={formState.annualFamilyIncome}
                  onChange={(e) => setField("annualFamilyIncome", e.target.value)}
                  placeholder="e.g., Under ₹8,00,000 per annum"
                  className={inputClass}
                />
              </Field>

              <Field
                id="profile-financialBackground"
                label="Financial background (optional context)"
              >
                <textarea
                  id="profile-financialBackground"
                  rows={2}
                  value={formState.financialBackground}
                  onChange={(e) => setField("financialBackground", e.target.value)}
                  placeholder="Any supporting context you want recorded for need-based review…"
                  className={inputClass}
                />
              </Field>
            </div>
          </SectionCard>

          <SectionCard
            id="additional"
            title="Additional eligibility details"
            description="Achievements, research interests and category — all optional, all used only where a scholarship asks for them."
            icon={Sparkles}
          >
            <div className="space-y-4">
              <Field
                id="profile-socialCategory"
                label="Category (optional)"
                hint="Share this only if you want reservation-based awards assessed. Leave blank to skip those rules."
              >
                <select
                  id="profile-socialCategory"
                  value={formState.socialCategory}
                  onChange={(e) => setField("socialCategory", e.target.value)}
                  className={inputClass}
                >
                  <option value="">Prefer not to say</option>
                  <option value="General">General</option>
                  <option value="OBC">OBC</option>
                  <option value="SC">SC</option>
                  <option value="ST">ST</option>
                  <option value="EWS">EWS</option>
                </select>
              </Field>

              <Field id="profile-achievements" label="Achievements">
                <textarea
                  id="profile-achievements"
                  rows={2}
                  value={formState.achievements}
                  onChange={(e) => setField("achievements", e.target.value)}
                  placeholder="Hackathon wins, publications, projects, volunteering…"
                  className={inputClass}
                />
              </Field>

              <Field id="profile-researchInterests" label="Research interests">
                <input
                  id="profile-researchInterests"
                  type="text"
                  value={formState.researchInterests}
                  onChange={(e) => setField("researchInterests", e.target.value)}
                  placeholder="e.g., Machine learning, open source systems"
                  className={inputClass}
                />
              </Field>

              <Field
                id="profile-leadership"
                label="Leadership, Research & Extracurricular Summary"
              >
                <textarea
                  id="profile-leadership"
                  rows={3}
                  value={formState.leadershipSummary}
                  onChange={(e) => setField("leadershipSummary", e.target.value)}
                  placeholder="Describe research projects, open-source contributions, or campus leadership..."
                  className={inputClass}
                />
              </Field>
            </div>
          </SectionCard>

          <Card className="sticky bottom-4 flex flex-wrap items-center justify-between gap-3 p-4">
            <span className="inline-flex items-center gap-1.5 text-xs text-[#64748B]">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#059669]" aria-hidden="true" />
              {isDirty ? "Unsaved changes — matches update after saving" : "Persisted locally in your browser"}
            </span>
            <Button
              type="submit"
              variant="primary"
              size="md"
              leftIcon={<Save className="h-4 w-4" aria-hidden="true" />}
            >
              Save Profile
            </Button>
          </Card>
        </form>

        {/* Live sidebar */}
        <div className="space-y-5 xl:col-span-4">
          <Card className="p-5" aria-labelledby="live-match-preview">
            <h2
              id="live-match-preview"
              className="font-display text-base font-semibold text-[#0F172A]"
            >
              Live match preview
            </h2>
            <p className="mt-0.5 text-xs text-[#64748B]">
              Recalculated as you type — nothing is saved until you press Save Profile.
            </p>
            <div className="mt-4 flex items-center gap-4">
              <MatchRing
                score={preview.summary.profileCompleteness}
                category={preview.summary.profileCompleteness >= 80 ? "strong" : "potential"}
                size={76}
                strokeWidth={7}
              />
              <dl className="flex-1 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <dt className="text-[#64748B]">Strong matches</dt>
                  <dd className="font-semibold text-[#047857] tabular-nums">
                    {preview.summary.strong}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[#64748B]">Potential</dt>
                  <dd className="font-semibold text-[#B45309] tabular-nums">
                    {preview.summary.potential}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[#64748B]">Not eligible</dt>
                  <dd className="font-semibold text-[#BE123C] tabular-nums">
                    {preview.summary.notEligible}
                  </dd>
                </div>
              </dl>
            </div>
            <Link to="/eligibility" className="mt-4 block">
              <Button
                variant="subtle"
                size="md"
                fullWidth
                rightIcon={<ArrowUpRight className="h-4 w-4" aria-hidden="true" />}
              >
                Open full breakdown
              </Button>
            </Link>
          </Card>

          <ProfileCompletionCard completion={profileCompletion} />
        </div>
      </div>
    </div>
  );
}
