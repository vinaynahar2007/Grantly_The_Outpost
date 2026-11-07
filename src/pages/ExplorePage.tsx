import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  X,
  SlidersHorizontal,
  SearchX,
  Info,
  Scale,
  RotateCcw,
} from "lucide-react";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useStudentData } from "@/context/StudentDataContext";
import { Button, Card } from "@/components/ui";
import {
  ActiveFilterChips,
  CompareBar,
  CompareScholarships,
  ScholarshipCard,
  ScholarshipEmptyState,
  ScholarshipFilterPanel,
} from "@/components/scholarships";
import type {
  ActiveFilterChip,
  ExplorerFilters,
  ScholarshipSortOption,
} from "@/types";
import {
  EMPTY_EXPLORER_FILTERS,
  SORT_OPTIONS,
  applyExplorerQuery,
  buildActiveFilterChips,
  countActiveFilters,
  removeFilterChip,
} from "@/utils/explorerLogic";

function ExplorerSkeleton() {
  return (
    <div
      className="grid gap-4 md:grid-cols-2"
      role="status"
      aria-label="Loading scholarships"
    >
      {[0, 1, 2, 3].map((item) => (
        <div
          key={item}
          className="animate-pulse rounded-2xl border border-[#E2E8F0] bg-white p-5"
        >
          <div className="h-5 w-24 rounded-full bg-[#EEF2F6]" />
          <div className="mt-4 h-5 w-3/4 rounded bg-[#EEF2F6]" />
          <div className="mt-2 h-4 w-1/2 rounded bg-[#EEF2F6]" />
          <div className="mt-4 h-20 rounded-xl bg-[#F8F9FC]" />
          <div className="mt-4 h-8 w-full rounded-lg bg-[#EEF2F6]" />
        </div>
      ))}
      <span className="sr-only">Loading scholarship results…</span>
    </div>
  );
}

export function ExplorePage() {
  useDocumentTitle("Explore Scholarships");

  const {
    scholarships,
    eligibilityById,
    compareIds,
    compareScholarships,
    toggleSaveScholarship,
    toggleCompareScholarship,
    removeFromCompare,
    clearCompare,
    isScholarshipSaved,
    isInCompare,
  } = useStudentData();

  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<ExplorerFilters>(EMPTY_EXPLORER_FILTERS);
  const [sort, setSort] = useState<ScholarshipSortOption>("recommended");
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsLoading(false), 300);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isMobileFiltersOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMobileFiltersOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMobileFiltersOpen]);

  const results = useMemo(
    () => applyExplorerQuery(scholarships, searchQuery, filters, sort, eligibilityById),
    [scholarships, searchQuery, filters, sort, eligibilityById]
  );

  const activeChips = useMemo(() => buildActiveFilterChips(filters), [filters]);
  const activeFilterCount = countActiveFilters(filters);
  const hasSearch = searchQuery.trim().length > 0;

  const resetAll = () => {
    setFilters(EMPTY_EXPLORER_FILTERS);
    setSearchQuery("");
    setSort("recommended");
  };

  const handleRemoveChip = (chip: ActiveFilterChip) => {
    setFilters((prev) => removeFilterChip(prev, chip));
  };

  return (
    <div>
      {/* A. Page Header */}
      <div className="mb-6 border-b border-[#E2E8F0] pb-6">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="font-display text-2xl font-bold tracking-[-0.025em] text-[#0F172A] sm:text-[28px]">
            Explore Scholarships
          </h1>
          <span className="inline-flex items-center rounded-full border border-[#DDD6FE] bg-[#F5F3FF] px-2.5 py-0.5 text-xs font-semibold text-[#6D28D9] tabular-nums">
            {scholarships.length} scholarships
          </span>
        </div>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[#64748B]">
          Find funding opportunities that match your ambitions.
        </p>
        <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-[#64748B]">
          <Info className="h-3.5 w-3.5 text-[#6D28D9]" aria-hidden="true" />
          {scholarships.length} scholarships available in the demonstration dataset · All records
          are sample/demo data, not verified active listings.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Desktop Filter Panel */}
        <aside className="hidden lg:col-span-3 lg:block" aria-label="Scholarship filters">
          <Card className="sticky top-24 p-5">
            <ScholarshipFilterPanel
              filters={filters}
              onFiltersChange={setFilters}
              onReset={resetAll}
              resultCount={results.length}
              idPrefix="desktop-filter"
            />
          </Card>
        </aside>

        {/* Main Results Column */}
        <div className="lg:col-span-9">
          {/* B. Search + Toolbar */}
          <Card className="p-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
              <div className="relative flex-1">
                <label htmlFor="scholarship-search" className="sr-only">
                  Search scholarships by name, provider, category or keyword
                </label>
                <Search
                  className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#6D28D9]"
                  aria-hidden="true"
                />
                <input
                  id="scholarship-search"
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search by scholarship, provider, category or keyword…"
                  className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8F9FC] py-2.5 pr-10 pl-10 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:border-[#7C3AED] focus:bg-white focus:outline-none"
                />
                {hasSearch && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    aria-label="Clear search"
                    className="absolute top-1/2 right-2.5 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-[#64748B] hover:bg-[#E2E8F0] hover:text-[#0F172A]"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsMobileFiltersOpen(true)}
                  className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-[#E2E8F0] bg-white px-4 text-sm font-medium text-[#0F172A] shadow-2xs hover:bg-[#F8F9FC] lg:hidden"
                  aria-haspopup="dialog"
                >
                  <SlidersHorizontal className="h-4 w-4 text-[#6D28D9]" aria-hidden="true" />
                  Filters
                  {activeFilterCount > 0 && (
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#6D28D9] px-1 text-[11px] font-bold text-white tabular-nums">
                      {activeFilterCount}
                    </span>
                  )}
                </button>

                <div className="flex items-center gap-2">
                  <label
                    htmlFor="scholarship-sort"
                    className="text-xs font-medium whitespace-nowrap text-[#64748B]"
                  >
                    Sort by
                  </label>
                  <select
                    id="scholarship-sort"
                    value={sort}
                    onChange={(event) => setSort(event.target.value as ScholarshipSortOption)}
                    className="h-10 rounded-[10px] border border-[#E2E8F0] bg-white px-3 text-sm font-medium text-[#0F172A] focus:border-[#7C3AED] focus:outline-none"
                  >
                    {SORT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => setIsCompareOpen(true)}
                  leftIcon={<Scale className="h-4 w-4 text-[#6D28D9]" aria-hidden="true" />}
                >
                  Compare ({compareIds.length})
                </Button>

                {(hasSearch || activeFilterCount > 0) && (
                  <Button
                    variant="ghost"
                    size="md"
                    onClick={resetAll}
                    leftIcon={<RotateCcw className="h-4 w-4" aria-hidden="true" />}
                    className="text-[#6D28D9] hover:bg-[#F5F3FF]"
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#EEF2F6] pt-3">
              <p className="text-xs font-medium text-[#475569]" aria-live="polite">
                Showing{" "}
                <strong className="text-[#0F172A] tabular-nums">{results.length}</strong> of{" "}
                <span className="tabular-nums">{scholarships.length}</span> scholarships
                {hasSearch && (
                  <>
                    {" "}
                    for <strong className="text-[#0F172A]">“{searchQuery.trim()}”</strong>
                  </>
                )}
              </p>
              <Link
                to="/saved"
                className="text-xs font-semibold text-[#6D28D9] underline-offset-2 hover:underline"
              >
                View saved scholarships
              </Link>
            </div>

            <ActiveFilterChips
              chips={activeChips}
              onRemove={handleRemoveChip}
              onClearAll={resetAll}
              className="mt-3"
            />
          </Card>

          {/* Results */}
          <div className="mt-5" aria-busy={isLoading}>
            {isLoading ? (
              <ExplorerSkeleton />
            ) : results.length === 0 ? (
              <ScholarshipEmptyState
                icon={SearchX}
                title={hasSearch ? "No Search Results Found" : "No Scholarships Match These Filters"}
                description={
                  hasSearch
                    ? `We couldn't find a demonstration scholarship matching “${searchQuery.trim()}”. Try a provider, category or keyword — or clear the search to browse everything.`
                    : "No demonstration scholarships satisfy every selected filter at once. Remove a filter or reset all filters to widen the results."
                }
                action={
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button variant="primary" size="md" onClick={resetAll}>
                      Clear Filters
                    </Button>
                    <Link to="/dashboard">
                      <Button variant="secondary" size="md">
                        Back to Dashboard
                      </Button>
                    </Link>
                  </div>
                }
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {results.map((scholarship) => {
                  const eligibility = eligibilityById.get(scholarship.id);
                  if (!eligibility) return null;
                  return (
                    <ScholarshipCard
                      key={scholarship.id}
                      scholarship={scholarship}
                      eligibility={eligibility}
                      isSaved={isScholarshipSaved(scholarship.id)}
                      isCompared={isInCompare(scholarship.id)}
                      onToggleSave={toggleSaveScholarship}
                      onToggleCompare={toggleCompareScholarship}
                    />
                  );
                })}
              </div>
            )}
          </div>

          <CompareBar
            scholarships={compareScholarships}
            onOpenCompare={() => setIsCompareOpen(true)}
            onRemove={removeFromCompare}
            onClear={clearCompare}
          />
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      {isMobileFiltersOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Scholarship filters"
        >
          <div
            className="fixed inset-0 bg-[#0F172A]/45 backdrop-blur-[2px]"
            onClick={() => setIsMobileFiltersOpen(false)}
            aria-hidden="true"
          />
          <div className="relative flex h-full w-[320px] max-w-[88vw] flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#EEF2F6] p-4">
              <p className="font-display text-base font-semibold text-[#0F172A]">
                Filter Scholarships
              </p>
              <button
                type="button"
                onClick={() => setIsMobileFiltersOpen(false)}
                aria-label="Close filters"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#64748B] hover:bg-[#F1F4F9] hover:text-[#0F172A]"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <ScholarshipFilterPanel
                filters={filters}
                onFiltersChange={setFilters}
                onReset={resetAll}
                resultCount={results.length}
                idPrefix="mobile-filter"
              />
            </div>

            <div className="flex gap-2 border-t border-[#EEF2F6] p-4">
              <Button variant="secondary" size="md" onClick={resetAll} className="flex-1">
                Reset All
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => setIsMobileFiltersOpen(false)}
                className="flex-1"
              >
                Show {results.length} Results
              </Button>
            </div>
          </div>
        </div>
      )}

      <CompareScholarships
        isOpen={isCompareOpen}
        scholarships={compareScholarships}
        eligibilityById={eligibilityById}
        onClose={() => setIsCompareOpen(false)}
        onRemove={removeFromCompare}
        onClear={clearCompare}
      />
    </div>
  );
}
