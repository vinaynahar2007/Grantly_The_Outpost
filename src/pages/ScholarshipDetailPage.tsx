import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  Building2,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  FileText,
  FolderPlus,
  GraduationCap,
  Info,
  Landmark,
  ListChecks,
  MapPin,
  Scale,
  Sparkles,
  Trophy,
  Wallet,
  XCircle,
} from "lucide-react";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useStudentData } from "@/context/StudentDataContext";
import { Badge, Button, Card } from "@/components/ui";
import {
  evaluateDeadline,
  formatDisplayDate,
  formatINR,
} from "@/utils/dashboardLogic";
import { formatAmountRange, getScholarshipBadges } from "@/utils/explorerLogic";
import { DashboardEmptyState } from "@/components/dashboard";
import { cn } from "@/utils/cn";
import { APPLICATION_STATUSES } from "@/data/applicationStatuses";
import { findActiveApplication } from "@/utils/applicationLogic";
import { getSafeExternalUrl } from "@/utils/externalUrl";

const eligibilityStyles = {
  Eligible: "border-[#A7F3D0] bg-[#ECFDF5] text-[#047857]",
  "Potential Match": "border-[#FDE68A] bg-[#FFFBEB] text-[#B45309]",
  "Not Eligible": "border-[#E2E8F0] bg-[#F1F4F9] text-[#64748B]",
} as const;

function SectionCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof FileText;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5 sm:p-6">
      <h2 className="flex items-center gap-2 font-display text-base font-semibold text-[#0F172A]">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#DDD6FE] bg-[#F5F3FF] text-[#6D28D9]">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function ScholarshipDetailPage() {
  const { scholarshipId } = useParams<{ scholarshipId: string }>();
  const {
    scholarships,
    applications,
    eligibilityById,
    isScholarshipSaved,
    toggleSaveScholarship,
    isInCompare,
    toggleCompareScholarship,
    startApplication,
  } = useStudentData();

  const scholarship = scholarships.find((item) => item.id === scholarshipId);
  useDocumentTitle(scholarship ? scholarship.title : "Scholarship Details");

  if (!scholarship) {
    return (
      <div className="space-y-6">
        <Link
          to="/explore"
          className="inline-flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-2 text-xs font-medium text-[#334155] shadow-2xs hover:bg-[#F8F9FC]"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Back to Explorer
        </Link>

        <DashboardEmptyState
          icon={Info}
          title="Scholarship Record Not Found"
          description="The requested scholarship demonstration record could not be located. It may have been removed or the link is invalid."
          action={
            <Link to="/explore">
              <Button variant="primary" size="md">
                Explore Scholarships
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  const isSaved = isScholarshipSaved(scholarship.id);
  const compared = isInCompare(scholarship.id);
  const existingApplication =
    findActiveApplication(applications, scholarship.id) ??
    applications.find((app) => app.scholarshipId === scholarship.id);
  const deadlineInfo = evaluateDeadline(scholarship.deadline);
  const officialUrl = getSafeExternalUrl(scholarship.officialUrl);
  const eligibility = eligibilityById.get(scholarship.id);
  const badges = getScholarshipBadges(scholarship, eligibility);

  return (
    <div className="space-y-6">
      {/* Back navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/explore"
            className="inline-flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-2 text-xs font-medium text-[#334155] shadow-2xs hover:bg-[#F8F9FC] hover:text-[#0F172A]"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Back to Explorer
          </Link>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium text-[#64748B] hover:bg-white hover:text-[#0F172A]"
          >
            Back to Dashboard
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={compared ? "primary" : "secondary"}
            size="md"
            onClick={() => toggleCompareScholarship(scholarship.id)}
            leftIcon={<Scale className="h-4 w-4" aria-hidden="true" />}
          >
            {compared ? "Comparing" : "Compare"}
          </Button>
          <Button
            variant={isSaved ? "subtle" : "secondary"}
            size="md"
            onClick={() => toggleSaveScholarship(scholarship.id)}
            leftIcon={
              isSaved ? (
                <BookmarkCheck className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Bookmark className="h-4 w-4" aria-hidden="true" />
              )
            }
          >
            {isSaved ? "Saved" : "Save Scholarship"}
          </Button>
          {existingApplication ? (
            <Link
              to={`/applications?application=${encodeURIComponent(existingApplication.id)}`}
            >
              <Button
                variant="secondary"
                size="md"
                className={
                  APPLICATION_STATUSES[existingApplication.status].className
                }
              >
                Tracked (
                {APPLICATION_STATUSES[existingApplication.status].label})
              </Button>
            </Link>
          ) : (
            <Button
              variant="primary"
              size="md"
              onClick={() => startApplication(scholarship.id)}
              leftIcon={<FolderPlus className="h-4 w-4" aria-hidden="true" />}
            >
              Add to Application Tracker
            </Button>
          )}
        </div>
      </div>

      {/* Demonstration banner */}
      <div
        role="note"
        className="flex items-start gap-2.5 rounded-2xl border border-[#DDD6FE] bg-[#F5F3FF]/80 px-4 py-3 text-xs text-[#4C1D95]"
      >
        <Info
          className="mt-0.5 h-4 w-4 shrink-0 text-[#6D28D9]"
          aria-hidden="true"
        />
        <span>
          <strong>Demonstration Record:</strong> This scholarship profile is a
          sample preview record for GRANTLY and is not a verified active grant.
          Amounts, dates and criteria are illustrative only.
        </span>
      </div>

      {/* Overview header */}
      <Card className="p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="violet">{scholarship.category}</Badge>
          {badges.map((badge) => (
            <Badge
              key={badge}
              variant={badge === "Best Match" ? "emerald" : "outline"}
            >
              {badge}
            </Badge>
          ))}
          <Badge variant="outline">Demo Data</Badge>
          {eligibility && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold tabular-nums",
                eligibilityStyles[eligibility.status],
              )}
            >
              <Sparkles className="h-3 w-3" aria-hidden="true" />
              {eligibility.percentage}% · {eligibility.status}
            </span>
          )}
        </div>

        <h1 className="mt-3 font-display text-2xl font-bold tracking-[-0.025em] text-[#0F172A] sm:text-3xl">
          {scholarship.title}
        </h1>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-medium text-[#64748B]">
          <span className="inline-flex items-center gap-1.5">
            <Building2 className="h-4 w-4" aria-hidden="true" />
            {scholarship.provider}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-4 w-4" aria-hidden="true" />
            {scholarship.location}
          </span>
        </p>

        <div className="mt-5 grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <h2 className="font-display text-base font-semibold text-[#0F172A]">
              Scholarship Overview
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#334155]">
              {scholarship.description}
            </p>
            <p className="mt-3 rounded-xl border border-[#EEF2F6] bg-[#F8F9FC] p-3.5 text-sm text-[#475569]">
              {scholarship.eligibilitySummary}
            </p>

            <h3 className="mt-5 flex items-center gap-2 text-sm font-semibold text-[#0F172A]">
              <Building2
                className="h-4 w-4 text-[#6D28D9]"
                aria-hidden="true"
              />
              About the Provider
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-[#475569]">
              {scholarship.providerDescription}
            </p>
          </div>

          {/* Key facts */}
          <dl className="space-y-3 rounded-2xl border border-[#EEF2F6] bg-[#F8F9FC] p-5 lg:col-span-4">
            <div>
              <dt className="flex items-center gap-1.5 text-xs font-medium text-[#64748B]">
                <Wallet className="h-3.5 w-3.5" aria-hidden="true" /> Award
                Amount
              </dt>
              <dd className="mt-1 font-display text-xl font-bold text-[#0F172A] tabular-nums">
                {formatAmountRange(scholarship)}
              </dd>
              <dd className="text-[11px] text-[#64748B]">
                Maximum {formatINR(scholarship.amount)} ·{" "}
                {scholarship.renewable
                  ? "Renewable annually"
                  : "One-time award"}{" "}
                · Potential funding, not guaranteed
              </dd>
            </div>
            <div className="border-t border-[#E2E8F0]/70 pt-3">
              <dt className="flex items-center gap-1.5 text-xs font-medium text-[#64748B]">
                <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />{" "}
                Application Deadline
              </dt>
              <dd className="mt-1 font-display text-base font-semibold text-[#0F172A]">
                {deadlineInfo.formattedDate}
              </dd>
              <dd className="text-[11px] font-medium text-[#475569]">
                {deadlineInfo.label} ·{" "}
                {deadlineInfo.remainingDays < 0
                  ? "This demonstration deadline has passed"
                  : `${deadlineInfo.remainingDays} days remaining`}
              </dd>
            </div>
            <div className="border-t border-[#E2E8F0]/70 pt-3">
              <dt className="flex items-center gap-1.5 text-xs font-medium text-[#64748B]">
                <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />{" "}
                Education Level
              </dt>
              <dd className="mt-1 text-sm font-semibold text-[#0F172A]">
                {scholarship.educationLevels.join(" / ")}
              </dd>
              <dd className="text-[11px] text-[#64748B]">
                {scholarship.tags.join(" · ")}
              </dd>
            </div>
          </dl>
        </div>

        {/* Eligibility explainer */}
        {eligibility && (
          <div className="mt-6 rounded-2xl border border-[#E2E8F0] p-5">
            <h2 className="font-display text-base font-semibold text-[#0F172A]">
              Your Eligibility — {eligibility.percentage}% {eligibility.status}
            </h2>
            <p className="mt-1 text-xs text-[#64748B]">
              Calculated from your actual Scholar Profile. GRANTLY never
              confirms eligibility while mandatory profile information is
              missing.
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-[11px] font-semibold tracking-wide text-[#047857] uppercase">
                  Matched criteria
                </p>
                <ul className="mt-2 space-y-1.5">
                  {eligibility.matchedCriteria.length === 0 && (
                    <li className="text-xs text-[#64748B]">
                      No criteria confirmed yet.
                    </li>
                  )}
                  {eligibility.matchedCriteria.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-1.5 text-xs text-[#334155]"
                    >
                      <CheckCircle2
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#059669]"
                        aria-hidden="true"
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-[11px] font-semibold tracking-wide text-[#64748B] uppercase">
                  Not matching
                </p>
                <ul className="mt-2 space-y-1.5">
                  {eligibility.failedCriteria.length === 0 && (
                    <li className="text-xs text-[#64748B]">
                      No failed criteria detected.
                    </li>
                  )}
                  {eligibility.failedCriteria.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-1.5 text-xs text-[#334155]"
                    >
                      <XCircle
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#94A3B8]"
                        aria-hidden="true"
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-[11px] font-semibold tracking-wide text-[#B45309] uppercase">
                  Missing profile information
                </p>
                <ul className="mt-2 space-y-1.5">
                  {eligibility.missingProfileInfo.length === 0 && (
                    <li className="text-xs text-[#64748B]">
                      No mandatory profile information is missing.
                    </li>
                  )}
                  {eligibility.missingProfileInfo.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-1.5 text-xs text-[#334155]"
                    >
                      <CircleAlert
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#D97706]"
                        aria-hidden="true"
                      />
                      {item}
                    </li>
                  ))}
                </ul>
                {eligibility.missingProfileInfo.length > 0 && (
                  <Link to="/profile" className="mt-3 inline-block">
                    <Button variant="subtle" size="sm">
                      Complete Profile
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Detail sections */}
      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard title="Eligibility Criteria" icon={ListChecks}>
          <ul className="space-y-2.5">
            {scholarship.eligibilityCriteria.map((criterion) => (
              <li
                key={criterion}
                className="flex items-start gap-2.5 text-sm text-[#334155]"
              >
                <CheckCircle2
                  className="mt-0.5 h-4 w-4 shrink-0 text-[#059669]"
                  aria-hidden="true"
                />
                <span>{criterion}</span>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="Academic Requirements" icon={GraduationCap}>
          <ul className="space-y-2.5">
            {scholarship.academicRequirements.map((requirement) => (
              <li
                key={requirement}
                className="flex items-start gap-2.5 text-sm text-[#334155]"
              >
                <CheckCircle2
                  className="mt-0.5 h-4 w-4 shrink-0 text-[#6D28D9]"
                  aria-hidden="true"
                />
                <span>{requirement}</span>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="Financial Requirements" icon={Landmark}>
          <ul className="space-y-2.5">
            {scholarship.financialRequirements.map((requirement) => (
              <li
                key={requirement}
                className="flex items-start gap-2.5 text-sm text-[#334155]"
              >
                <Wallet
                  className="mt-0.5 h-4 w-4 shrink-0 text-[#059669]"
                  aria-hidden="true"
                />
                <span>{requirement}</span>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="Required Documents" icon={FileText}>
          <ul className="space-y-2.5">
            {scholarship.requiredDocuments.map((doc) => (
              <li
                key={doc}
                className="flex items-start gap-2.5 text-sm text-[#334155]"
              >
                <FileText
                  className="mt-0.5 h-4 w-4 shrink-0 text-[#6D28D9]"
                  aria-hidden="true"
                />
                <span>{doc}</span>
              </li>
            ))}
          </ul>
          <Link to="/documents" className="mt-4 inline-block">
            <Button variant="secondary" size="sm">
              Open Document Vault
            </Button>
          </Link>
        </SectionCard>

        <SectionCard title="Benefits" icon={Trophy}>
          <ul className="space-y-2.5">
            {scholarship.benefits.map((benefit) => (
              <li
                key={benefit}
                className="flex items-start gap-2.5 text-sm text-[#334155]"
              >
                <Sparkles
                  className="mt-0.5 h-4 w-4 shrink-0 text-[#059669]"
                  aria-hidden="true"
                />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="Application Procedure" icon={ListChecks}>
          <ol className="space-y-3">
            {scholarship.applicationSteps.map((step, index) => (
              <li
                key={step}
                className="flex items-start gap-3 text-sm text-[#334155]"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#6D28D9] font-mono text-[11px] font-bold text-white tabular-nums">
                  {index + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
          <div className="mt-5 flex flex-wrap gap-2 border-t border-[#EEF2F6] pt-4">
            {existingApplication ? (
              <Link
                to={`/applications?application=${encodeURIComponent(existingApplication.id)}`}
              >
                <Button variant="emerald" size="md">
                  View in Application Tracker
                </Button>
              </Link>
            ) : (
              <Button
                variant="primary"
                size="md"
                onClick={() => startApplication(scholarship.id)}
                leftIcon={<FolderPlus className="h-4 w-4" aria-hidden="true" />}
              >
                Add to Application Tracker
              </Button>
            )}
            <Link to="/calendar">
              <Button variant="secondary" size="md">
                View Deadline Calendar
              </Button>
            </Link>
          </div>
        </SectionCard>

        <SectionCard title="Important Dates" icon={CalendarClock}>
          <ul className="space-y-2.5">
            {scholarship.importantDates.map((item) => (
              <li
                key={`${item.label}-${item.date}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-[#EEF2F6] bg-[#F8F9FC] px-3.5 py-2.5 text-sm"
              >
                <span className="font-medium text-[#334155]">{item.label}</span>
                <time
                  dateTime={item.date}
                  className="font-semibold text-[#0F172A] tabular-nums"
                >
                  {formatDisplayDate(item.date)}
                </time>
              </li>
            ))}
            <li className="flex items-center justify-between gap-3 rounded-xl border border-[#EEF2F6] bg-[#F8F9FC] px-3.5 py-2.5 text-sm">
              <span className="font-medium text-[#334155]">
                Record last verified
              </span>
              <span className="font-semibold text-[#64748B]">
                Not verified (demo)
              </span>
            </li>
          </ul>
        </SectionCard>

        <SectionCard title="Official Application Link" icon={Landmark}>
          {officialUrl ? (
            <div>
              <p className="text-sm text-[#475569]">
                Apply through the provider's verified official portal:
              </p>
              <a
                href={officialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex h-10 items-center rounded-[10px] bg-[#6D28D9] px-4 text-sm font-medium text-white hover:bg-[#5B21B6]"
              >
                Open Official Application
              </a>
            </div>
          ) : (
            <div
              role="note"
              className="flex items-start gap-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8F9FC] p-3.5 text-sm text-[#475569]"
            >
              <Info
                className="mt-0.5 h-4 w-4 shrink-0 text-[#64748B]"
                aria-hidden="true"
              />
              <span>
                <strong className="text-[#0F172A]">
                  Official link unavailable.
                </strong>{" "}
                No verified official application URL exists for this
                demonstration record, so no external destination has been
                invented. Use{" "}
                <strong className="text-[#0F172A]">
                  Add to Application Tracker
                </strong>{" "}
                to manage this opportunity inside GRANTLY.
              </span>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
