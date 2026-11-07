import { RotateCcw, X } from "lucide-react";
import type {
  ActiveFilterChip,
  AmountRangeId,
  DeadlineFilter,
  EducationLevel,
  EligibilityFilter,
  ExplorerFilters,
  ScholarshipCategory,
  ScholarshipLocation,
} from "@/types";
import { Button } from "@/components/ui";
import {
  AMOUNT_RANGES,
  CATEGORY_OPTIONS,
  EDUCATION_LEVEL_OPTIONS,
  LOCATION_OPTIONS,
} from "@/utils/explorerLogic";
import { cn } from "@/utils/cn";

export interface ScholarshipFilterPanelProps {
  filters: ExplorerFilters;
  onFiltersChange: (filters: ExplorerFilters) => void;
  onReset: () => void;
  resultCount: number;
  /** Keeps input ids unique when desktop + mobile instances coexist. */
  idPrefix?: string;
}

function toggleValue<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

const ELIGIBILITY_OPTIONS: Array<{ value: EligibilityFilter; label: string }> = [
  { value: "all", label: "All scholarships" },
  { value: "eligible", label: "Matching my profile" },
  { value: "potential", label: "Potentially matching" },
  { value: "not-eligible", label: "Not matching" },
];

const DEADLINE_OPTIONS: Array<{ value: DeadlineFilter; label: string }> = [
  { value: "all", label: "All deadlines" },
  { value: "7", label: "Closing within 7 days" },
  { value: "30", label: "Closing within 30 days" },
  { value: "90", label: "Closing within 90 days" },
];

function FilterSection({
  legend,
  children,
}: {
  legend: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="border-t border-[#EEF2F6] pt-4 first:border-t-0 first:pt-0">
      <legend className="float-left mb-2.5 text-xs font-semibold tracking-[0.02em] text-[#0F172A]">
        {legend}
      </legend>
      <div className="clear-both space-y-1.5">{children}</div>
    </fieldset>
  );
}

function CheckRow({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-[#334155] transition-colors hover:bg-[#F8F9FC]"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 shrink-0 rounded border-[#CBD5E1] accent-[#6D28D9]"
      />
      <span>{label}</span>
    </label>
  );
}

function RadioRow({
  id,
  name,
  label,
  checked,
  onChange,
}: {
  id: string;
  name: string;
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-[#334155] transition-colors hover:bg-[#F8F9FC]"
    >
      <input
        id={id}
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 shrink-0 accent-[#6D28D9]"
      />
      <span>{label}</span>
    </label>
  );
}

export function ScholarshipFilterPanel({
  filters,
  onFiltersChange,
  onReset,
  resultCount,
  idPrefix = "filter",
}: ScholarshipFilterPanelProps) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-[#0F172A]">Filters</p>
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          leftIcon={<RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />}
          className="text-[#6D28D9] hover:bg-[#F5F3FF]"
        >
          Reset All
        </Button>
      </div>
      <p className="mt-1 text-xs text-[#64748B]" aria-live="polite">
        {resultCount} matching result{resultCount === 1 ? "" : "s"} · filters combine with AND
        logic
      </p>

      <div className="mt-4 space-y-5">
        <FilterSection legend="Education Level">
          {EDUCATION_LEVEL_OPTIONS.map((level: EducationLevel) => (
            <CheckRow
              key={level}
              id={`${idPrefix}-education-${level}`}
              label={level}
              checked={filters.educationLevels.includes(level)}
              onChange={() =>
                onFiltersChange({
                  ...filters,
                  educationLevels: toggleValue(filters.educationLevels, level),
                })
              }
            />
          ))}
        </FilterSection>

        <FilterSection legend="Scholarship Category">
          {CATEGORY_OPTIONS.map((category: ScholarshipCategory) => (
            <CheckRow
              key={category}
              id={`${idPrefix}-category-${category}`}
              label={category}
              checked={filters.categories.includes(category)}
              onChange={() =>
                onFiltersChange({
                  ...filters,
                  categories: toggleValue(filters.categories, category),
                })
              }
            />
          ))}
        </FilterSection>

        <FilterSection legend="Award Amount">
          {AMOUNT_RANGES.map((range) => (
            <CheckRow
              key={range.id}
              id={`${idPrefix}-amount-${range.id}`}
              label={range.label}
              checked={filters.amountRanges.includes(range.id as AmountRangeId)}
              onChange={() =>
                onFiltersChange({
                  ...filters,
                  amountRanges: toggleValue(filters.amountRanges, range.id as AmountRangeId),
                })
              }
            />
          ))}
        </FilterSection>

        <FilterSection legend="Location">
          {LOCATION_OPTIONS.map((location: ScholarshipLocation) => (
            <CheckRow
              key={location}
              id={`${idPrefix}-location-${location}`}
              label={location}
              checked={filters.locations.includes(location)}
              onChange={() =>
                onFiltersChange({
                  ...filters,
                  locations: toggleValue(filters.locations, location),
                })
              }
            />
          ))}
        </FilterSection>

        <FilterSection legend="Eligibility">
          {ELIGIBILITY_OPTIONS.map((option) => (
            <RadioRow
              key={option.value}
              id={`${idPrefix}-eligibility-${option.value}`}
              name={`${idPrefix}-eligibility-filter`}
              label={option.label}
              checked={filters.eligibility === option.value}
              onChange={() => onFiltersChange({ ...filters, eligibility: option.value })}
            />
          ))}
        </FilterSection>

        <FilterSection legend="Deadline">
          {DEADLINE_OPTIONS.map((option) => (
            <RadioRow
              key={option.value}
              id={`${idPrefix}-deadline-${option.value}`}
              name={`${idPrefix}-deadline-filter`}
              label={option.label}
              checked={filters.deadline === option.value}
              onChange={() => onFiltersChange({ ...filters, deadline: option.value })}
            />
          ))}
        </FilterSection>
      </div>
    </div>
  );
}

export interface ActiveFilterChipsProps {
  chips: ActiveFilterChip[];
  onRemove: (chip: ActiveFilterChip) => void;
  onClearAll: () => void;
  className?: string;
}

export function ActiveFilterChips({
  chips,
  onRemove,
  onClearAll,
  className,
}: ActiveFilterChipsProps) {
  if (chips.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span className="text-xs font-medium text-[#64748B]">Active filters:</span>
      {chips.map((chip) => (
        <span
          key={chip.id}
          className="inline-flex items-center gap-1.5 rounded-full border border-[#DDD6FE] bg-[#F5F3FF] py-1 pr-1.5 pl-3 text-xs font-medium text-[#5B21B6]"
        >
          {chip.label}
          <button
            type="button"
            onClick={() => onRemove(chip)}
            aria-label={`Remove filter ${chip.label}`}
            className="inline-flex h-4.5 w-4.5 items-center justify-center rounded-full text-[#6D28D9] hover:bg-[#DDD6FE]"
          >
            <X className="h-3 w-3" aria-hidden="true" />
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="text-xs font-semibold text-[#6D28D9] underline-offset-2 hover:underline"
      >
        Clear all
      </button>
    </div>
  );
}
