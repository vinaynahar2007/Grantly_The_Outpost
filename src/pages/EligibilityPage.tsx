import { lazy, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  CircleAlert,
  GaugeCircle,
  ListFilter,
  RotateCcw,
  ScanSearch,
  Search,
  ShieldCheck,
  Sparkles,
  UserCheck,
  X,
  XCircle,
} from "lucide-react";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useScholarshipMatches } from "@/hooks/useScholarshipMatches";
import { useStudentData } from "@/context/StudentDataContext";
import { useToast } from "@/context/ToastContext";
import { Button, Card } from "@/components/ui";
import {
  ImproveYourMatch,
  MATCH_CATEGORY_TOKENS,
  MatchCard,
  MatchDetailDrawer,
  MatchingSummaryHero,
  MatchStatTile,
} from "@/components/eligibility";
import { DeferredContent } from "@/components/ui/DeferredContent";
import { DashboardEmptyState } from "@/components/dashboard";
import {
  CRITERION_GROUP_LABELS,
  MATCH_WEIGHTS,
  STRONG_MATCH_THRESHOLD,
} from "@/services/matchingEngine";
import type { CriterionGroup, MatchFilter, MatchSortOption } from "@/types";
import { getScholarFirstName } from "@/utils/dashboardLogic";
import { cn } from "@/utils/cn";

const MatchDistributionChart = lazy(() =>
  import("@/components/eligibility/MatchDistributionChart").then((module) => ({
    default: module.MatchDistributionChart,
  })),
);

const SORT_LABELS: Array<{ value: MatchSortOption; label: string }> = [
  { value: "score-desc", label: "Highest match percentage" },
  { value: "amount-desc", label: "Highest award amount" },
  { value: "deadline-asc", label: "Nearest deadline" },
];

const CORE_GROUPS: CriterionGroup[] = [
  "education",
  "academic",
  "financial",
  "location",
  "course",
];

function ScoringRulesPanel() {
  const supplementary = (Object.keys(MATCH_WEIGHTS) as CriterionGroup[]).filter(
    (group) => !CORE_GROUPS.includes(group)
  );

  return (
    <Card className="flex h-full flex-col p-5 sm:p-6" aria-labelledby="scoring-rules-heading">
      <h2
        id="scoring-rules-heading"
        className="flex items-center gap-2 font-display text-base font-semibold tracking-[-0.015em] text-[#0F172A]"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#DDD6FE] bg-[#F5F3FF] text-[#6D28D9]">
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
        </span>
        How the scoring works
      </h2>
      <p className="mt-1.5 text-xs leading-relaxed text-[#64748B]">
        A deterministic rule engine — no model, no randomness. Identical profile data always
        produces an identical result.
      </p>

      <ul className="mt-4 space-y-2">
        {CORE_GROUPS.map((group) => (
          <li key={group} className="flex items-center gap-3">
            <span className="w-[132px] shrink-0 text-[11px] font-medium text-[#334155]">
              {CRITERION_GROUP_LABELS[group]}
            </span>
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#EEF2F6]">
              <span
                className="block h-full rounded-full bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6]"
                style={{ width: `${(MATCH_WEIGHTS[group] / 25) * 100}%` }}
              />
            </span>
            <span className="w-9 shrink-0 text-right font-mono text-[11px] font-semibold text-[#0F172A] tabular-nums">
              {MATCH_WEIGHTS[group]}%
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-[11px] leading-relaxed text-[#64748B]">
        Supplementary preference groups (
        {supplementary.map((group) => CRITERION_GROUP_LABELS[group].toLowerCase()).join(", ")}) add{" "}
        {supplementary.map((group) => MATCH_WEIGHTS[group]).join(" / ")} points when a scholarship
        states them. All weights are normalised over applicable criteria only.
      </p>

      <ol className="mt-4 space-y-2 border-t border-[#EEF2F6] pt-4">
        {[
          "Missing information scores zero and never counts as a match.",
          "Any failed mandatory rule returns Not Eligible — the score cannot override it.",
          "A missing mandatory field returns Potential Match until you supply it.",
          `Strong Match needs ${STRONG_MATCH_THRESHOLD}%+ with all mandatory rules satisfied.`,
        ].map((rule, index) => (
          <li key={rule} className="flex items-start gap-2.5 text-[11px] leading-relaxed text-[#475569]">
            <span className="mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#0F172A] font-mono text-[9px] font-bold text-white tabular-nums">
              {index + 1}
            </span>
            {rule}
          </li>
        ))}
      </ol>
    </Card>
  );
}

export function EligibilityPage() {
  useDocumentTitle("Smart Eligibility Matcher");

  const { profile, isScholarshipSaved, toggleSaveScholarship } = useStudentData();
  const { showToast } = useToast();
  const { matches, summary, completeness, improvements, rerun, isRerunning, query } =
    useScholarshipMatches();

  const [filter, setFilter] = useState<MatchFilter>("all");
  const [sort, setSort] = useState<MatchSortOption>("score-desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [openMatchId, setOpenMatchId] = useState<string | null>(null);

  const visibleMatches = useMemo(
    () => query({ filter, sort, query: searchQuery }),
    [query, filter, sort, searchQuery]
  );

  const openMatch = useMemo(
    () => matches.find((match) => match.scholarshipId === openMatchId) ?? null,
    [matches, openMatchId]
  );

  const filterTabs: Array<{ value: MatchFilter; label: string; count: number }> = [
    { value: "all", label: "All scholarships", count: summary.total },
    { value: "strong", label: "Strong", count: summary.strong },
    { value: "potential", label: "Potential", count: summary.potential },
    { value: "low", label: "Low", count: summary.low },
    { value: "not-eligible", label: "Not eligible", count: summary.notEligible },
  ];

  const handleRerun = () => {
    rerun();
    showToast({
      title: "Analysis re-run",
      description: `${summary.total} scholarships re-evaluated against your current profile.`,
      tone: "success",
    });
  };

  const resetControls = () => {
    setFilter("all");
    setSort("score-desc");
    setSearchQuery("");
  };

  return (
    <div className="space-y-6">
      <MatchingSummaryHero
        summary={summary}
        scholarName={getScholarFirstName(profile.fullName)}
        onRerun={handleRerun}
        isRerunning={isRerunning}
      />

      {/* Overview tiles */}
      <section
        aria-label="Matching overview"
        className="grid grid-cols-2 gap-4 sm:grid-cols-3 2xl:grid-cols-6"
      >
        <MatchStatTile
          label="Scholarships analysed"
          value={String(summary.total)}
          hint="Every record in the dataset"
          icon={ScanSearch}
          color="#6D28D9"
          soft="bg-[#F5F3FF]"
          border="border-[#DDD6FE]"
          active={filter === "all"}
          onClick={() => setFilter("all")}
        />
        <MatchStatTile
          label="Strong matches"
          value={String(summary.strong)}
          hint={`${STRONG_MATCH_THRESHOLD}%+ · all mandatory rules met`}
          icon={Sparkles}
          color={MATCH_CATEGORY_TOKENS.strong.color}
          soft={MATCH_CATEGORY_TOKENS.strong.soft}
          border={MATCH_CATEGORY_TOKENS.strong.border}
          active={filter === "strong"}
          onClick={() => setFilter("strong")}
        />
        <MatchStatTile
          label="Potential matches"
          value={String(summary.potential)}
          hint="Waiting on missing information"
          icon={CircleAlert}
          color={MATCH_CATEGORY_TOKENS.potential.color}
          soft={MATCH_CATEGORY_TOKENS.potential.soft}
          border={MATCH_CATEGORY_TOKENS.potential.border}
          active={filter === "potential"}
          onClick={() => setFilter("potential")}
        />
        <MatchStatTile
          label="Low matches"
          value={String(summary.low)}
          hint="Eligible, preferred criteria unmet"
          icon={GaugeCircle}
          color={MATCH_CATEGORY_TOKENS.low.color}
          soft={MATCH_CATEGORY_TOKENS.low.soft}
          border={MATCH_CATEGORY_TOKENS.low.border}
          active={filter === "low"}
          onClick={() => setFilter("low")}
        />
        <MatchStatTile
          label="Not eligible"
          value={String(summary.notEligible)}
          hint="A mandatory rule has failed"
          icon={XCircle}
          color={MATCH_CATEGORY_TOKENS["not-eligible"].color}
          soft={MATCH_CATEGORY_TOKENS["not-eligible"].soft}
          border={MATCH_CATEGORY_TOKENS["not-eligible"].border}
          active={filter === "not-eligible"}
          onClick={() => setFilter("not-eligible")}
        />
        <MatchStatTile
          label="Profile completeness"
          value={`${summary.profileCompleteness}%`}
          hint={`${completeness.completedCount} of ${completeness.totalCount} fields recorded`}
          icon={UserCheck}
          color="#0F172A"
          soft="bg-[#F1F4F9]"
          border="border-[#E2E8F0]"
        />
      </section>

      {/* Transparency row */}
      <div className="grid min-w-0 gap-6 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-7">
          <DeferredContent
            fallback={
              <Card
                className="min-h-[620px] p-5 sm:p-6"
                role="status"
                aria-label="Loading criteria distribution chart"
              >
                <div className="h-6 w-48 animate-pulse rounded bg-[#F1F4F9]" />
                <div className="mt-4 h-[260px] animate-pulse rounded-xl bg-[#F8F9FC]" />
                <div className="mt-4 h-48 animate-pulse rounded-xl bg-[#F8F9FC]" />
              </Card>
            }
          >
            <MatchDistributionChart matches={matches} />
          </DeferredContent>
        </div>
        <div className="min-w-0 xl:col-span-5">
          <ScoringRulesPanel />
        </div>
      </div>

      <ImproveYourMatch improvements={improvements} completeness={completeness} />

      {/* Results */}
      <section aria-labelledby="match-results-heading">
        <div className="z-20 -mx-1 mb-4 rounded-2xl border border-[#E2E8F0] bg-[#F8F9FC]/92 px-3 py-3 backdrop-blur-md sm:px-4 lg:sticky lg:top-16">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-2">
              <h2
                id="match-results-heading"
                className="font-display text-base font-semibold tracking-[-0.015em] text-[#0F172A]"
              >
                Match results
              </h2>
              <span
                className="inline-flex items-center rounded-full border border-[#DDD6FE] bg-[#F5F3FF] px-2 py-0.5 text-[11px] font-semibold text-[#6D28D9] tabular-nums"
                aria-live="polite"
              >
                {visibleMatches.length} shown
              </span>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative sm:w-64">
                <label htmlFor="match-search" className="sr-only">
                  Search matches by scholarship name or provider
                </label>
                <Search
                  className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#6D28D9]"
                  aria-hidden="true"
                />
                <input
                  id="match-search"
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search name or provider…"
                  className="h-9 w-full rounded-[10px] border border-[#E2E8F0] bg-white pr-8 pl-9 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:border-[#7C3AED] focus:outline-none"
                />
                {searchQuery.trim() !== "" && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    aria-label="Clear match search"
                    className="absolute top-1/2 right-2 inline-flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-[#64748B] hover:bg-[#E2E8F0] hover:text-[#0F172A]"
                  >
                    <X className="h-3 w-3" aria-hidden="true" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <label
                  htmlFor="match-sort"
                  className="text-[11px] font-medium whitespace-nowrap text-[#64748B]"
                >
                  Sort by
                </label>
                <select
                  id="match-sort"
                  value={sort}
                  onChange={(event) => setSort(event.target.value as MatchSortOption)}
                  className="h-9 rounded-[10px] border border-[#E2E8F0] bg-white px-2.5 text-xs font-medium text-[#0F172A] focus:border-[#7C3AED] focus:outline-none"
                >
                  {SORT_LABELS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div
            className="mt-3 flex flex-wrap items-center gap-1.5"
            role="group"
            aria-label="Filter matches by category"
          >
            <ListFilter className="mr-0.5 h-3.5 w-3.5 text-[#64748B]" aria-hidden="true" />
            {filterTabs.map((tab) => {
              const isActive = filter === tab.value;
              const token = tab.value === "all" ? null : MATCH_CATEGORY_TOKENS[tab.value];
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setFilter(tab.value)}
                  aria-pressed={isActive}
                  className={cn(
                    "inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED]",
                    isActive
                      ? "border-[#0F172A] bg-[#0F172A] text-white"
                      : "border-[#E2E8F0] bg-white text-[#475569] hover:border-[#CBD5E1] hover:text-[#0F172A]"
                  )}
                >
                  {token && (
                    <span
                      className="h-2 w-2 rounded-sm"
                      style={{ backgroundColor: token.color }}
                      aria-hidden="true"
                    />
                  )}
                  {tab.label}
                  <span className="tabular-nums opacity-80">{tab.count}</span>
                </button>
              );
            })}
            {(filter !== "all" || sort !== "score-desc" || searchQuery.trim() !== "") && (
              <button
                type="button"
                onClick={resetControls}
                className="ml-1 inline-flex h-7 items-center gap-1 rounded-full px-2 text-[11px] font-semibold text-[#6D28D9] hover:bg-[#F5F3FF]"
              >
                <RotateCcw className="h-3 w-3" aria-hidden="true" />
                Reset
              </button>
            )}
          </div>
        </div>

        {filter === "not-eligible" && visibleMatches.length > 0 && (
          <div
            role="note"
            className="mb-4 flex items-start gap-2.5 rounded-2xl border border-[#FECDD3] bg-[#FFF1F2] px-4 py-3 text-xs text-[#9F1239]"
          >
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              These scholarships fail at least one mandatory requirement recorded on your profile.
              GRANTLY shows the exact rule that failed — it never suggests changing a factual
              answer to force a match.
            </span>
          </div>
        )}

        {visibleMatches.length === 0 ? (
          <DashboardEmptyState
            icon={Activity}
            title={
              searchQuery.trim() !== ""
                ? "No matches for this search"
                : "No scholarships in this category"
            }
            description={
              searchQuery.trim() !== ""
                ? `No analysed scholarship matches “${searchQuery.trim()}”. Try a different name or provider.`
                : "Nothing currently falls into this match category. Complete more profile fields or review all analysed scholarships."
            }
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button variant="primary" size="sm" onClick={resetControls}>
                  Show all matches
                </Button>
                <Link to="/profile">
                  <Button variant="secondary" size="sm">
                    Complete profile
                  </Button>
                </Link>
              </div>
            }
          />
        ) : (
          <ul className="grid min-w-0 gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {visibleMatches.map((match, index) => (
              <li key={match.scholarshipId} className="min-w-0">
                <MatchCard
                  match={match}
                  index={index}
                  isSaved={isScholarshipSaved(match.scholarshipId)}
                  onToggleSave={toggleSaveScholarship}
                  onOpenBreakdown={setOpenMatchId}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <Card className="flex flex-wrap items-center justify-between gap-3 border-dashed p-4">
        <p className="text-xs text-[#64748B]">
          Results are recalculated from your live profile every time this page renders — no
          eligibility verdict is ever cached or stored.
        </p>
        <Link to="/explore">
          <Button
            variant="ghost"
            size="sm"
            className="text-[#6D28D9] hover:bg-[#F5F3FF]"
            rightIcon={<ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />}
          >
            Browse the full catalogue
          </Button>
        </Link>
      </Card>

      <MatchDetailDrawer
        match={openMatch}
        isSaved={openMatch ? isScholarshipSaved(openMatch.scholarshipId) : false}
        onToggleSave={toggleSaveScholarship}
        onClose={() => setOpenMatchId(null)}
      />
    </div>
  );
}
