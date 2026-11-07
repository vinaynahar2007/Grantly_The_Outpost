import type { ScholarshipMatch } from "@/types";
import { Card } from "@/components/ui";
import { MATCH_WEIGHTS, summarizeCriteriaByGroup } from "@/services/matchingEngine";

export interface MatchDistributionChartProps {
  matches: ScholarshipMatch[];
}

const SERIES = [
  { key: "satisfied", label: "Satisfied", color: "#059669" },
  { key: "needsInformation", label: "Needs information", color: "#D97706" },
  { key: "failed", label: "Not satisfied", color: "#E11D48" },
] as const;

export function MatchDistributionChart({ matches }: MatchDistributionChartProps) {
  const rows = summarizeCriteriaByGroup(matches);
  const maxCount = Math.max(
    1,
    ...rows.map(
      (row) => row.satisfied + row.needsInformation + row.failed,
    ),
  );

  return (
    <Card className="min-w-0 p-5 sm:p-6" aria-labelledby="criteria-distribution-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2
            id="criteria-distribution-heading"
            className="font-display text-base font-semibold tracking-[-0.015em] text-[#0F172A]"
          >
            Where the rules land
          </h2>
          <p className="mt-0.5 text-xs text-[#64748B]">
            Criterion outcomes across every analysed scholarship, grouped by weighted category.
          </p>
        </div>
        <ul className="flex flex-wrap gap-3">
          {SERIES.map((series) => (
            <li key={series.key} className="flex items-center gap-1.5 text-[11px] text-[#475569]">
              <span
                className="h-2.5 w-2.5 rounded-sm"
                style={{ backgroundColor: series.color }}
                aria-hidden="true"
              />
              {series.label}
            </li>
          ))}
        </ul>
      </div>

      <div
        className="mt-4 flex min-h-[260px] flex-col justify-center gap-2"
        aria-hidden="true"
      >
        {rows.map((row) => (
          <div key={row.group} className="flex items-center gap-3">
            <span className="w-32 shrink-0 truncate text-right text-[11px] text-[#64748B] sm:w-36">
              {row.label}
            </span>
            <span className="flex h-4 min-w-0 flex-1 overflow-hidden rounded bg-[#F1F4F9]">
              {SERIES.map((series) => (
                <span
                  key={series.key}
                  className="h-full"
                  style={{
                    width: `${(row[series.key] / maxCount) * 100}%`,
                    backgroundColor: series.color,
                  }}
                />
              ))}
            </span>
          </div>
        ))}
      </div>

      {/* Accessible + scannable data table mirroring the chart */}
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse text-left text-[11px]">
          <caption className="sr-only">
            Criterion outcomes and configured base weights per category
          </caption>
          <thead>
            <tr className="text-[#64748B]">
              <th scope="col" className="py-1.5 pr-3 font-semibold">Category</th>
              <th scope="col" className="py-1.5 pr-3 font-semibold">Weight</th>
              <th scope="col" className="py-1.5 pr-3 font-semibold text-[#047857]">Satisfied</th>
              <th scope="col" className="py-1.5 pr-3 font-semibold text-[#B45309]">Needs info</th>
              <th scope="col" className="py-1.5 font-semibold text-[#BE123C]">Not satisfied</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.group} className="border-t border-[#EEF2F6]">
                <th scope="row" className="py-1.5 pr-3 font-medium text-[#334155]">
                  {row.label}
                </th>
                <td className="py-1.5 pr-3 font-mono text-[#475569] tabular-nums">
                  {MATCH_WEIGHTS[row.group]}%
                </td>
                <td className="py-1.5 pr-3 font-semibold text-[#047857] tabular-nums">
                  {row.satisfied}
                </td>
                <td className="py-1.5 pr-3 font-semibold text-[#B45309] tabular-nums">
                  {row.needsInformation}
                </td>
                <td className="py-1.5 font-semibold text-[#BE123C] tabular-nums">{row.failed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-[#64748B]">
        Base weights are normalised per scholarship: only the criteria a record actually states
        contribute to its denominator, so a scholarship without a financial rule is never penalised
        for one.
      </p>
    </Card>
  );
}
