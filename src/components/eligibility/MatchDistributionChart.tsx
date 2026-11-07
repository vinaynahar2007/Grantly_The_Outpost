import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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

  return (
    <Card className="p-5 sm:p-6" aria-labelledby="criteria-distribution-heading">
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

      <div className="mt-4 h-[260px] w-full" aria-hidden="true">
        <ResponsiveContainer width="100%" height={260} minWidth={220}>
          <BarChart
            data={rows}
            layout="vertical"
            margin={{ top: 4, right: 16, bottom: 0, left: 8 }}
            barCategoryGap={10}
          >
            <CartesianGrid horizontal={false} stroke="#EEF2F6" />
            <XAxis
              type="number"
              allowDecimals={false}
              tick={{ fill: "#64748B", fontSize: 11 }}
              axisLine={{ stroke: "#E2E8F0" }}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={148}
              tick={{ fill: "#0F172A", fontSize: 11, fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: "#F8F9FC" }}
              contentStyle={{
                backgroundColor: "#FFFFFF",
                borderColor: "#E2E8F0",
                borderRadius: "12px",
                fontSize: "12px",
                color: "#0F172A",
                boxShadow: "0 8px 20px -4px rgb(15 23 42 / 0.08)",
              }}
            />
            <Legend wrapperStyle={{ display: "none" }} />
            {SERIES.map((series, index) => (
              <Bar
                key={series.key}
                dataKey={series.key}
                name={series.label}
                stackId="outcomes"
                fill={series.color}
                maxBarSize={20}
                radius={index === SERIES.length - 1 ? [0, 6, 6, 0] : undefined}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
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
