import { cn } from "@/utils/cn";

export interface BrandLogoProps {
  showTagline?: boolean;
  compact?: boolean;
  className?: string;
}

export function BrandLogo({ showTagline = false, compact = false, className }: BrandLogoProps) {
  return (
    <div className={cn("inline-flex items-center gap-3 select-none", className)}>
      <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#6D28D9] via-[#5B21B6] to-[#312E81] shadow-[0_4px_12px_-2px_rgb(109_40_217_/_0.35)]">
        <svg
          className="h-5 w-5 text-white"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          {/* Architectural academic portal + funding spark */}
          <path
            d="M12 3.5L4.5 7.25V12.5C4.5 16.9 7.7 20.4 12 21.5C16.3 20.4 19.5 16.9 19.5 12.5V7.25L12 3.5Z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity="0.92"
          />
          <path
            d="M9.5 12.5H14.5V15.2C13.8 15.8 12.95 16.2 12 16.2C9.95 16.2 8.5 14.65 8.5 12.35C8.5 10.05 9.95 8.5 12.05 8.5C13.2 8.5 14.15 8.95 14.75 9.65"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="16.75" cy="7.5" r="1.5" fill="#10B981" />
        </svg>
      </div>

      {!compact && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="font-display text-[17px] font-bold tracking-[0.04em] text-[#0F172A]">
              GRANTLY
            </span>
          </div>
          {showTagline && (
            <span className="text-[11px] font-medium text-[#64748B]">
              Your future deserves funding.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
