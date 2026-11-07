import { useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { X, Sparkles } from "lucide-react";
import { NAVIGATION_ITEMS, NAV_SECTIONS } from "@/data/navigation";
import type { NavSection } from "@/types";
import { BrandLogo, Badge } from "@/components/ui";
import { cn } from "@/utils/cn";

export interface SidebarProps {
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

const SECTION_ORDER: NavSection[] = ["overview", "workspace", "account"];

export function Sidebar({ isMobileOpen, onCloseMobile }: SidebarProps) {
  const location = useLocation();

  // Close mobile drawer automatically on route navigation
  useEffect(() => {
    onCloseMobile();
  }, [location.pathname, onCloseMobile]);

  // Close mobile drawer on Escape key
  useEffect(() => {
    if (!isMobileOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCloseMobile();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMobileOpen, onCloseMobile]);

  const sidebarContent = (
    <div className="flex h-full flex-col bg-white border-r border-[#E2E8F0]">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-5 pt-6 pb-5 border-b border-[#EEF2F6]">
        <NavLink
          to="/dashboard"
          className="rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#7C3AED]"
          aria-label="GRANTLY Dashboard Home"
        >
          <BrandLogo showTagline />
        </NavLink>

        <button
          type="button"
          onClick={onCloseMobile}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#64748B] hover:bg-[#F1F4F9] hover:text-[#0F172A] lg:hidden"
          aria-label="Close navigation menu"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Navigation Sections */}
      <nav
        aria-label="Primary Navigation"
        className="flex-1 space-y-6 overflow-y-auto px-3.5 py-5"
      >
        {SECTION_ORDER.map((sectionKey) => {
          const items = NAVIGATION_ITEMS.filter((item) => item.section === sectionKey);

          return (
            <div key={sectionKey} className="space-y-1">
              <div className="px-3 pb-1.5 text-[11px] font-semibold tracking-[0.06em] text-[#64748B] uppercase">
                {NAV_SECTIONS[sectionKey]}
              </div>

              <ul className="space-y-1">
                {items.map((item) => {
                  const Icon = item.icon;

                  return (
                    <li key={item.id}>
                      <NavLink
                        to={item.path}
                        className={({ isActive }) =>
                          cn(
                            "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
                            isActive
                              ? "bg-[#F5F3FF] text-[#6D28D9] font-semibold shadow-[inset_0_0_0_1px_#DDD6FE]"
                              : "text-[#334155] hover:bg-[#F8F9FC] hover:text-[#0F172A]"
                          )
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <span
                              className={cn(
                                "absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full transition-opacity duration-150",
                                isActive ? "bg-[#6D28D9] opacity-100" : "opacity-0"
                              )}
                              aria-hidden="true"
                            />
                            <Icon
                              className={cn(
                                "h-[18px] w-[18px] shrink-0 transition-colors",
                                isActive
                                  ? "text-[#6D28D9]"
                                  : "text-[#64748B] group-hover:text-[#0F172A]"
                              )}
                              aria-hidden="true"
                            />
                            <span className="truncate">{item.label}</span>
                          </>
                        )}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* Bottom Workspace Status Footer */}
      <div className="border-t border-[#EEF2F6] p-4">
        <div className="rounded-xl border border-[#E2E8F0] bg-[#F8F9FC] p-3.5">
          <div className="flex items-center justify-between gap-2">
            <Badge variant="emerald" dot>
              System Ready
            </Badge>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#64748B]">
              <Sparkles className="h-3 w-3 text-[#6D28D9]" aria-hidden="true" />
              OUTPOST
            </span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-[#475569]">
            Foundation shell initialized. Modules ready for feature integration.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:w-[264px] lg:flex-col">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation Drawer"
        >
          <div
            className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-[2px] transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative flex h-full w-[280px] max-w-[85vw] flex-col shadow-[0_20px_40px_-12px_rgb(15_23_42_/_0.18)]">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
