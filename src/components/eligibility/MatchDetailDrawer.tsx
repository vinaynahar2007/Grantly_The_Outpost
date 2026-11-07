import { useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Bookmark, BookmarkCheck, Scale, X } from "lucide-react";
import type { CriterionGroup, MatchCriterion, ScholarshipMatch } from "@/types";
import { Button } from "@/components/ui";
import { formatINR } from "@/utils/dashboardLogic";
import {
  CRITERION_GROUP_LABELS,
  MATCH_WEIGHTS,
  STRONG_MATCH_THRESHOLD,
} from "@/services/matchingEngine";
import { MatchRing } from "./MatchRing";
import { CRITERION_STATE_TOKENS, MATCH_CATEGORY_TOKENS } from "./matchTokens";
import { cn } from "@/utils/cn";

export interface MatchDetailDrawerProps {
  match: ScholarshipMatch | null;
  isSaved: boolean;
  onToggleSave: (scholarshipId: string) => void;
  onClose: () => void;
}

export function MatchDetailDrawer({
  match,
  isSaved,
  onToggleSave,
  onClose,
}: MatchDetailDrawerProps) {
  const reduceMotion = useReducedMotion();
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!match) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusables = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [match, onClose]);

  const grouped = useMemo(() => {
    if (!match) return [] as Array<{ group: CriterionGroup; items: MatchCriterion[] }>;
    const map = new Map<CriterionGroup, MatchCriterion[]>();
    for (const criterion of match.criteria) {
      const list = map.get(criterion.group) ?? [];
      list.push(criterion);
      map.set(criterion.group, list);
    }
    return Array.from(map.entries()).map(([group, items]) => ({ group, items }));
  }, [match]);

  return (
    <AnimatePresence>
      {match && (
        <div className="fixed inset-0 z-50" role="presentation">
          <motion.div
            className="absolute inset-0 bg-[#0F172A]/50 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            aria-hidden="true"
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="match-breakdown-title"
            className="absolute inset-y-0 right-0 flex w-full max-w-[580px] flex-col bg-white shadow-[0_0_60px_-12px_rgb(15_23_42_/_0.4)]"
            initial={reduceMotion ? { opacity: 0 } : { x: "100%" }}
            animate={reduceMotion ? { opacity: 1 } : { x: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { x: "100%" }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-[#EEF2F6] bg-[#F8F9FC] p-5">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold tracking-[0.08em] text-[#6D28D9] uppercase">
                  Match breakdown
                </p>
                <h2
                  id="match-breakdown-title"
                  className="mt-1 font-display text-lg leading-snug font-bold text-[#0F172A]"
                >
                  {match.scholarship.title}
                </h2>
                <p className="mt-0.5 text-xs text-[#64748B]">
                  {match.scholarship.provider} · {formatINR(match.scholarship.amount)}
                </p>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                aria-label="Close match breakdown"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#E2E8F0] bg-white text-[#64748B] hover:bg-[#F1F4F9] hover:text-[#0F172A]"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5">
              {/* Verdict */}
              <div
                className={cn(
                  "flex items-center gap-4 rounded-2xl border p-4",
                  MATCH_CATEGORY_TOKENS[match.category].soft,
                  MATCH_CATEGORY_TOKENS[match.category].border
                )}
              >
                <MatchRing score={match.score} category={match.category} size={76} strokeWidth={7} />
                <div className="min-w-0">
                  <p
                    className={cn(
                      "font-display text-sm font-bold",
                      MATCH_CATEGORY_TOKENS[match.category].text
                    )}
                  >
                    {MATCH_CATEGORY_TOKENS[match.category].label} · {match.eligibilityStatus}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-[#334155]">{match.explanation}</p>
                </div>
              </div>

              {/* Score ledger */}
              <div className="mt-4 rounded-2xl border border-[#E2E8F0] p-4">
                <h3 className="flex items-center gap-2 font-display text-sm font-semibold text-[#0F172A]">
                  <Scale className="h-4 w-4 text-[#6D28D9]" aria-hidden="true" />
                  How the score was calculated
                </h3>
                <dl className="mt-3 grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-xl bg-[#F8F9FC] p-2.5">
                    <dt className="text-[10px] font-semibold tracking-wide text-[#64748B] uppercase">
                      Points earned
                    </dt>
                    <dd className="mt-1 font-display text-lg font-bold text-[#059669] tabular-nums">
                      {match.earnedPoints}
                    </dd>
                  </div>
                  <div className="rounded-xl bg-[#F8F9FC] p-2.5">
                    <dt className="text-[10px] font-semibold tracking-wide text-[#64748B] uppercase">
                      Out of
                    </dt>
                    <dd className="mt-1 font-display text-lg font-bold text-[#0F172A] tabular-nums">
                      100
                    </dd>
                  </div>
                  <div className="rounded-xl bg-[#F8F9FC] p-2.5">
                    <dt className="text-[10px] font-semibold tracking-wide text-[#64748B] uppercase">
                      Final score
                    </dt>
                    <dd className="mt-1 font-display text-lg font-bold text-[#6D28D9] tabular-nums">
                      {match.score}%
                    </dd>
                  </div>
                </dl>
                <p className="mt-3 text-[11px] leading-relaxed text-[#64748B]">
                  Base weights totalling {match.applicableWeight} were normalised to 100 across the{" "}
                  {match.criteria.length} criteria this scholarship actually states. Missing
                  information earns 0 points. Strong Match requires {STRONG_MATCH_THRESHOLD}% or
                  above with every mandatory rule satisfied — a failed mandatory rule always
                  returns Not Eligible.
                </p>
              </div>

              {/* Criteria */}
              <div className="mt-5 space-y-5">
                {grouped.map(({ group, items }) => (
                  <section key={group} aria-label={CRITERION_GROUP_LABELS[group]}>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-display text-sm font-semibold text-[#0F172A]">
                        {CRITERION_GROUP_LABELS[group]}
                      </h3>
                      <span className="text-[11px] font-medium text-[#64748B] tabular-nums">
                        base weight {MATCH_WEIGHTS[group]}
                      </span>
                    </div>

                    <ul className="mt-2 space-y-2">
                      {items.map((criterion) => {
                        const stateToken = CRITERION_STATE_TOKENS[criterion.state];
                        const StateIcon = stateToken.icon;
                        const ratio =
                          criterion.weight > 0 ? (criterion.points / criterion.weight) * 100 : 0;
                        return (
                          <li
                            key={criterion.id}
                            className={cn(
                              "rounded-xl border p-3",
                              stateToken.border,
                              stateToken.soft
                            )}
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-[#0F172A]">
                                  {criterion.label}
                                </p>
                                <span
                                  className={cn(
                                    "mt-1 inline-flex items-center gap-1 rounded-md border bg-white/70 px-1.5 py-0.5 text-[10px] font-semibold",
                                    stateToken.border,
                                    stateToken.text
                                  )}
                                >
                                  <StateIcon className="h-3 w-3" aria-hidden="true" />
                                  {stateToken.label}
                                </span>
                                <span className="ml-1.5 inline-flex items-center rounded-md border border-[#E2E8F0] bg-white/70 px-1.5 py-0.5 text-[10px] font-medium text-[#475569]">
                                  {criterion.kind === "mandatory" ? "Mandatory" : "Preferred"}
                                </span>
                              </div>
                              <span className="font-mono text-[11px] font-semibold text-[#334155] tabular-nums">
                                {criterion.points} / {criterion.weight} pts
                              </span>
                            </div>

                            <dl className="mt-2.5 grid gap-1.5 text-[11px] sm:grid-cols-2">
                              <div>
                                <dt className="font-semibold text-[#64748B]">Required</dt>
                                <dd className="text-[#334155]">{criterion.requirement}</dd>
                              </div>
                              <div>
                                <dt className="font-semibold text-[#64748B]">Your profile</dt>
                                <dd className="text-[#334155]">{criterion.studentValue}</dd>
                              </div>
                            </dl>

                            <p className="mt-2 text-[11px] leading-relaxed text-[#475569]">
                              {criterion.explanation}
                            </p>

                            <div
                              className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/80"
                              role="img"
                              aria-label={`${criterion.points} of ${criterion.weight} points earned`}
                            >
                              <div
                                className="h-full rounded-full bg-[#6D28D9] transition-all duration-500"
                                style={{ width: `${Math.max(0, Math.min(100, ratio))}%` }}
                              />
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="flex flex-wrap items-center gap-2 border-t border-[#EEF2F6] bg-[#F8F9FC] p-4">
              <Button
                variant={isSaved ? "subtle" : "secondary"}
                size="md"
                onClick={() => onToggleSave(match.scholarship.id)}
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
              <Link to={`/scholarships/${match.scholarship.id}`} className="flex-1">
                <Button
                  variant="primary"
                  size="md"
                  fullWidth
                  rightIcon={<ArrowUpRight className="h-4 w-4" aria-hidden="true" />}
                >
                  View full scholarship
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
