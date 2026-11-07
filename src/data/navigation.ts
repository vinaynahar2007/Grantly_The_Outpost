import {
  LayoutDashboard,
  Compass,
  ScanSearch,
  Bookmark,
  FolderKanban,
  FileText,
  CalendarDays,
  UserCircle,
} from "lucide-react";
import type { NavItem, NavSection } from "@/types";

export const NAV_SECTIONS: Record<NavSection, string> = {
  overview: "Overview",
  workspace: "Workspace",
  account: "Account",
};

export const NAVIGATION_ITEMS: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
    section: "overview",
    description: "Command center for your scholarship pipeline and readiness.",
  },
  {
    id: "explore",
    label: "Explore",
    path: "/explore",
    icon: Compass,
    section: "overview",
    description: "Discover vetted grants, fellowships, and merit scholarships.",
  },
  {
    id: "eligibility",
    label: "Smart Match",
    path: "/eligibility",
    icon: ScanSearch,
    section: "overview",
    description: "Transparent rule-based eligibility analysis of your profile.",
  },
  {
    id: "saved",
    label: "Saved",
    path: "/saved",
    icon: Bookmark,
    section: "overview",
    description: "Shortlisted funding opportunities bookmarked for review.",
  },
  {
    id: "applications",
    label: "Applications",
    path: "/applications",
    icon: FolderKanban,
    section: "workspace",
    description: "Track submission stages, essays, and milestone checklists.",
  },
  {
    id: "documents",
    label: "Documents",
    path: "/documents",
    icon: FileText,
    section: "workspace",
    description: "Organize transcripts, personal statements, and letters.",
  },
  {
    id: "calendar",
    label: "Calendar",
    path: "/calendar",
    icon: CalendarDays,
    section: "workspace",
    description: "Upcoming priority deadlines and submission schedules.",
  },
  {
    id: "profile",
    label: "Profile",
    path: "/profile",
    icon: UserCircle,
    section: "account",
    description: "Academic background and eligibility matching preferences.",
  },
];
