import { CheckCircle2, CircleAlert, GaugeCircle, XCircle } from "lucide-react";
import type { CriterionState, MatchCategory } from "@/types";

export interface CategoryToken {
  label: string;
  short: string;
  description: string;
  color: string;
  soft: string;
  border: string;
  text: string;
  icon: typeof CheckCircle2;
}

export const MATCH_CATEGORY_TOKENS: Record<MatchCategory, CategoryToken> = {
  strong: {
    label: "Strong Match",
    short: "Strong",
    description: "80%+ with every mandatory requirement satisfied.",
    color: "#059669",
    soft: "bg-[#ECFDF5]",
    border: "border-[#A7F3D0]",
    text: "text-[#047857]",
    icon: CheckCircle2,
  },
  potential: {
    label: "Potential Match",
    short: "Potential",
    description: "Mandatory information is missing or needs verification.",
    color: "#D97706",
    soft: "bg-[#FFFBEB]",
    border: "border-[#FDE68A]",
    text: "text-[#B45309]",
    icon: CircleAlert,
  },
  low: {
    label: "Low Match",
    short: "Low",
    description: "Mandatory rules pass, preferred criteria are unmet.",
    color: "#2563EB",
    soft: "bg-[#EFF6FF]",
    border: "border-[#BFDBFE]",
    text: "text-[#1D4ED8]",
    icon: GaugeCircle,
  },
  "not-eligible": {
    label: "Not Eligible",
    short: "Not eligible",
    description: "At least one mandatory criterion has failed.",
    color: "#E11D48",
    soft: "bg-[#FFF1F2]",
    border: "border-[#FECDD3]",
    text: "text-[#BE123C]",
    icon: XCircle,
  },
};

export const CRITERION_STATE_TOKENS: Record<
  CriterionState,
  { label: string; icon: typeof CheckCircle2; text: string; soft: string; border: string }
> = {
  satisfied: {
    label: "Satisfied",
    icon: CheckCircle2,
    text: "text-[#047857]",
    soft: "bg-[#ECFDF5]",
    border: "border-[#A7F3D0]",
  },
  "needs-information": {
    label: "Needs information",
    icon: CircleAlert,
    text: "text-[#B45309]",
    soft: "bg-[#FFFBEB]",
    border: "border-[#FDE68A]",
  },
  failed: {
    label: "Not satisfied",
    icon: XCircle,
    text: "text-[#BE123C]",
    soft: "bg-[#FFF1F2]",
    border: "border-[#FECDD3]",
  },
  "not-applicable": {
    label: "Not applicable",
    icon: GaugeCircle,
    text: "text-[#64748B]",
    soft: "bg-[#F1F4F9]",
    border: "border-[#E2E8F0]",
  },
};
