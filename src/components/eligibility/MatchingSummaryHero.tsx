import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, RefreshCw, ScanLine, ShieldCheck } from "lucide-react";
import type { MatchSummary } from "@/types";
import { MatchRing } from "./MatchRing";
import { MATCH_CATEGORY_TOKENS } from "./matchTokens";

export interface MatchingSummaryHeroProps {
  summary: MatchSummary;
  scholarName: string;
  onRerun: () => void;
  isRerunning: boolean;
}

function formatTime(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "just now";
  return parsed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function MatchingSummaryHero({
  summary,
  scholarName,
  onRerun,
  isRerunning,
}: MatchingSummaryHeroProps) {
  const reduceMotion = useReducedMotion();
  const segments = [
    { key: "strong", value: summary.strong },
    { key: "potential", value: summary.potential },
    { key: "low", value: summary.low },
    { key: "not-eligible", value: summary.notEligible },
  ] as const;

  return (
    <section
      aria-labelledby="matcher-hero-heading"
      className="relative overflow-hidden rounded-3xl border border-[#2E1065] bg-[#150A32] p-6 text-white shadow-[0_24px_60px_-28px_rgb(46_16_101_/_0.65)] sm:p-8"
    >
      {/* Layered light field */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(90% 120% at 8% 0%, rgba(124,58,237,0.55) 0%, rgba(21,10,50,0) 55%), radial-gradient(70% 90% at 92% 12%, rgba(37,99,235,0.38) 0%, rgba(21,10,50,0) 60%), radial-gradient(80% 110% at 70% 108%, rgba(5,150,105,0.34) 0%, rgba(21,10,50,0) 62%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.16]"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.55) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      />
      {!reduceMotion && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 left-1/3 h-64 w-64 rounded-full bg-[#8B5CF6]/25 blur-3xl"
          animate={{ x: [0, 60, -20, 0], y: [0, 24, -12, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      <div className="relative grid gap-7 lg:grid-cols-12 lg:items-center">
        <div className="lg:col-span-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold tracking-[0.08em] uppercase">
              <ScanLine className="h-3.5 w-3.5" aria-hidden="true" />
              Rule-based analysis
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#34D399]/40 bg-[#059669]/15 px-3 py-1 text-[11px] font-semibold text-[#A7F3D0]">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              No AI guesswork
            </span>
          </div>

          <h1
            id="matcher-hero-heading"
            className="mt-4 font-display text-[26px] leading-[1.15] font-bold tracking-[-0.03em] sm:text-[34px]"
          >
            Your profile matches{" "}
            <span className="relative whitespace-nowrap text-[#A7F3D0]">
              {summary.matchingCount}
              <span
                aria-hidden="true"
                className="absolute -bottom-1 left-0 h-[3px] w-full rounded-full bg-gradient-to-r from-[#34D399] via-[#8B5CF6] to-transparent"
              />
            </span>{" "}
            scholarship {summary.matchingCount === 1 ? "opportunity" : "opportunities"}.
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/70">
            {scholarName}, GRANTLY checked {summary.total} demonstration scholarships against your
            recorded profile. {summary.strong} are strong matches, {summary.potential} need more
            information, and {summary.notEligible} fail a mandatory rule. Every point below is
            traceable to a specific requirement.
          </p>

          {/* Distribution spectrum */}
          <div className="mt-5">
            <div
              className="flex h-2.5 w-full overflow-hidden rounded-full bg-white/10"
              role="img"
              aria-label={`Distribution: ${summary.strong} strong, ${summary.potential} potential, ${summary.low} low, ${summary.notEligible} not eligible`}
            >
              {segments.map((segment) =>
                segment.value === 0 ? null : (
                  <motion.span
                    key={segment.key}
                    className="h-full"
                    style={{ backgroundColor: MATCH_CATEGORY_TOKENS[segment.key].color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${(segment.value / Math.max(summary.total, 1)) * 100}%` }}
                    transition={{ duration: reduceMotion ? 0 : 0.6, ease: "easeOut" }}
                  />
                )
              )}
            </div>
            <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
              {segments.map((segment) => {
                const token = MATCH_CATEGORY_TOKENS[segment.key];
                return (
                  <li key={segment.key} className="flex items-center gap-2 text-xs text-white/75">
                    <span
                      className="h-2.5 w-2.5 rounded-sm"
                      style={{ backgroundColor: token.color }}
                      aria-hidden="true"
                    />
                    <span className="font-semibold text-white tabular-nums">{segment.value}</span>
                    {token.label}
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onRerun}
              disabled={isRerunning}
              className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-white px-4 text-sm font-semibold text-[#2E1065] transition-colors hover:bg-[#EDE9FE] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-70"
            >
              <RefreshCw
                className={isRerunning ? "h-4 w-4 animate-spin" : "h-4 w-4"}
                aria-hidden="true"
              />
              {isRerunning ? "Re-running rules…" : "Re-run analysis"}
            </button>
            <Link
              to="/explore"
              className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-white/25 bg-white/5 px-4 text-sm font-medium text-white transition-colors hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Open Explorer
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <span className="text-xs text-white/55 tabular-nums" aria-live="polite">
              Last calculated {formatTime(summary.analyzedAt)}
            </span>
          </div>
        </div>

        <div className="lg:col-span-4">
          <div className="flex items-center gap-5 rounded-2xl border border-white/15 bg-white/[0.07] p-5 backdrop-blur-sm">
            <MatchRing
              score={summary.profileCompleteness}
              category={summary.profileCompleteness >= 80 ? "strong" : "potential"}
              size={92}
              strokeWidth={8}
              onDark
            />
            <div>
              <p className="font-display text-sm font-semibold text-white">Profile completeness</p>
              <p className="mt-1 text-xs leading-relaxed text-white/65">
                Missing fields are never assumed. Completing them converts potential matches into
                confirmed results.
              </p>
              <Link
                to="/profile"
                className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-[#A7F3D0] underline-offset-2 hover:underline"
              >
                Complete profile
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          </div>
          <p className="mt-3 text-center text-[11px] text-white/45">
            Average match score across all analysed records: {summary.averageScore}%
          </p>
        </div>
      </div>
    </section>
  );
}
