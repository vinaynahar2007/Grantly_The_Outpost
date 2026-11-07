import { motion, useReducedMotion } from "framer-motion";
import type { MatchCategory } from "@/types";
import { MATCH_CATEGORY_TOKENS } from "./matchTokens";
import { cn } from "@/utils/cn";

export interface MatchRingProps {
  score: number;
  category: MatchCategory;
  size?: number;
  strokeWidth?: number;
  showCategory?: boolean;
  onDark?: boolean;
  className?: string;
}

/** Deterministic SVG gauge — the arc length is exactly the match score. */
export function MatchRing({
  score,
  category,
  size = 64,
  strokeWidth = 6,
  showCategory = false,
  onDark = false,
  className,
}: MatchRingProps) {
  const reduceMotion = useReducedMotion();
  const token = MATCH_CATEGORY_TOKENS[category];
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);

  return (
    <div
      className={cn("relative shrink-0", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${clamped} percent match — ${token.label}`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={onDark ? "rgba(255,255,255,0.16)" : "#EEF2F6"}
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={token.color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          initial={{ strokeDashoffset: reduceMotion ? offset : circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: reduceMotion ? 0 : 0.7, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={cn(
            "font-display font-bold tabular-nums leading-none",
            onDark ? "text-white" : "text-[#0F172A]",
            size >= 88 ? "text-2xl" : size >= 64 ? "text-base" : "text-xs"
          )}
        >
          {clamped}
          <span className={size >= 88 ? "text-sm" : "text-[10px]"}>%</span>
        </span>
        {showCategory && (
          <span
            className={cn(
              "mt-1 text-[10px] font-semibold tracking-wide uppercase",
              onDark ? "text-white/70" : "text-[#64748B]"
            )}
          >
            {token.short}
          </span>
        )}
      </div>
    </div>
  );
}
