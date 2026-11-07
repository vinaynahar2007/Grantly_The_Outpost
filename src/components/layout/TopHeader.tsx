import { Link, useLocation } from "react-router-dom";
import { Menu, Compass, UserCircle } from "lucide-react";
import { NAVIGATION_ITEMS, NAV_SECTIONS } from "@/data/navigation";
import { Badge, BrandLogo, Button } from "@/components/ui";

export interface TopHeaderProps {
  onOpenMobileMenu: () => void;
}

export function TopHeader({ onOpenMobileMenu }: TopHeaderProps) {
  const location = useLocation();
  const activeItem =
    NAVIGATION_ITEMS.find((item) => item.path === location.pathname) ?? NAVIGATION_ITEMS[0];

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between border-b border-[#E2E8F0] bg-[#F8F9FC]/90 px-4 backdrop-blur-md sm:px-6 lg:px-8">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#E2E8F0] bg-white text-[#0F172A] shadow-2xs hover:bg-[#F1F4F9] lg:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="h-4 w-4" aria-hidden="true" />
        </button>

        {/* Compact mobile brand mark */}
        <div className="flex items-center lg:hidden">
          <BrandLogo />
        </div>

        {/* Desktop Breadcrumb Context */}
        <div className="hidden items-center gap-2 text-sm lg:flex">
          <span className="font-medium text-[#64748B]">
            {NAV_SECTIONS[activeItem.section]}
          </span>
          <span className="text-[#CBD5E1]" aria-hidden="true">
            /
          </span>
          <span className="font-semibold text-[#0F172A]">{activeItem.label}</span>
        </div>
      </div>

      {/* Right Utility Actions */}
      <div className="flex items-center gap-2.5">
        <Badge variant="emerald" dot className="hidden sm:inline-flex">
          Workspace Ready
        </Badge>

        {activeItem.path !== "/explore" && (
          <Link to="/explore">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Compass className="h-3.5 w-3.5 text-[#6D28D9]" aria-hidden="true" />}
            >
              Explore
            </Button>
          </Link>
        )}

        {activeItem.path !== "/profile" && (
          <Link to="/profile" aria-label="Scholar Profile">
            <Button
              variant="ghost"
              size="icon"
              className="border border-transparent hover:border-[#E2E8F0] hover:bg-white"
              aria-label="Scholar Profile"
            >
              <UserCircle className="h-5 w-5 text-[#334155]" aria-hidden="true" />
            </Button>
          </Link>
        )}
      </div>
    </header>
  );
}
