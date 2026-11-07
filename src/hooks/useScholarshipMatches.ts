import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStudentData } from "@/context/StudentDataContext";
import { analyzeScholarships, queryMatches } from "@/services/matchingEngine";
import type { MatchFilter, MatchSortOption } from "@/types";

/**
 * Runs the rule engine against the live student profile. Results are derived
 * with useMemo on every profile/dataset change — eligibility conclusions are
 * never persisted, so a stale verdict can never be shown.
 */
export function useScholarshipMatches() {
  const { profile, scholarships } = useStudentData();
  const [runToken, setRunToken] = useState(0);
  const [isRerunning, setIsRerunning] = useState(false);
  const timerRef = useRef<number | null>(null);

  const analysis = useMemo(
    // runToken forces a fresh, timestamped recalculation on demand.
    () => analyzeScholarships(profile, scholarships, new Date()),
    [profile, scholarships, runToken]
  );

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    []
  );

  const rerun = useCallback(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    setIsRerunning(true);
    setRunToken((token) => token + 1);
    timerRef.current = window.setTimeout(() => {
      setIsRerunning(false);
      timerRef.current = null;
    }, 450);
  }, []);

  const query = useCallback(
    (options: { filter: MatchFilter; sort: MatchSortOption; query: string }) =>
      queryMatches(analysis.matches, options),
    [analysis.matches]
  );

  return { ...analysis, rerun, isRerunning, query };
}
