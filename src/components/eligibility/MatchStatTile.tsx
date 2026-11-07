import type { LucideIcon } from "lucide-react";
import { cn } from "@/utils/cn";

export interface MatchStatTileProps {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  color: string;
  soft: string;
  border: string;
  active?: boolean;
  onClick?: () => void;
}

export function MatchStatTile({
  label,
  value,
  hint,
  icon: Icon,
  color,
  soft,
  border,
  active = false,
  onClick,
}: MatchStatTileProps) {
  const content = (
    <>
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-[3px] rounded-t-2xl"
        style={{ backgroundColor: color }}
      />
      <div className="flex items-start justify-between gap-2">
        <span
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-xl border",
            soft,
            border
          )}
          style={{ color }}
        >
          <Icon className="h-4.5 w-4.5" aria-hidden="true" />
        </span>
        <span className="font-display text-2xl font-bold text-[#0F172A] tabular-nums">
          {value}
        </span>
      </div>
      <p className="mt-3 text-xs font-semibold text-[#0F172A]">{label}</p>
      <p className="mt-0.5 text-[11px] leading-relaxed text-[#64748B]">{hint}</p>
    </>
  );

  const base = cn(
    "relative w-full overflow-hidden rounded-2xl border bg-white p-4 text-left shadow-[0_1px_2px_0_rgb(15_23_42_/_0.04)] transition-all",
    active ? "border-[#6D28D9] ring-2 ring-[#DDD6FE]" : "border-[#E2E8F0]"
  );

  if (!onClick) {
    return <div className={base}>{content}</div>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        base,
        "hover:-translate-y-0.5 hover:border-[#CBD5E1] hover:shadow-[0_10px_24px_-8px_rgb(15_23_42_/_0.12)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED]"
      )}
    >
      {content}
    </button>
  );
}
