import {
  AlertTriangle,
  Bug,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type {
  IssueSeverity,
  IssueType,
  MergeReadiness,
  RiskLevel,
} from "@/app/types/prAnalysis";

export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function clampPercentage(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(100, value));
}

export function toFiniteNumber(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

export function confidenceToPercent(score: unknown): number {
  return clampPercentage(toFiniteNumber(score) * 100);
}

export function formatPercentLabel(score: unknown): string {
  return `${Math.round(confidenceToPercent(score))}%`;
}

export function getDecisionConfidenceLabel(
  mergeReadiness: MergeReadiness,
): string {
  const percent = confidenceToPercent(mergeReadiness.decisionConfidence);

  if (mergeReadiness.decisionType === "LOW_IMPACT_SAFE") {
    return "High confidence decision";
  }

  if (mergeReadiness.decisionType === "HIGH_RISK") {
    return "Needs review";
  }

  if (percent >= 85) {
    return "High confidence decision";
  }

  return "Moderate confidence decision";
}

export function getSignalStrengthLabel(signalStrength: number): string {
  const percent = confidenceToPercent(signalStrength);

  if (percent < 45) {
    return "Low";
  }

  if (percent < 75) {
    return "Moderate";
  }

  return "High";
}

export function getActionText(mergeReadiness: MergeReadiness): string {
  if (mergeReadiness.decisionType === "LOW_IMPACT_SAFE") {
    return "Safe to merge - optional review";
  }

  if (
    mergeReadiness.decisionType === "HIGH_RISK" ||
    mergeReadiness.status === "BLOCK"
  ) {
    return "Needs review before merge";
  }

  if (mergeReadiness.status === "CAUTION") {
    return "Review before merge";
  }

  return "Safe to merge";
}

export function getSignalStrengthReason(
  mergeReadiness: MergeReadiness,
  issueCount: number,
  impactScore?: number | null,
): string {
  if (mergeReadiness.decisionType === "LOW_IMPACT_SAFE") {
    return "Minimal code changes detected.";
  }

  if (issueCount > 0) {
    return "Review findings created stronger analysis signals.";
  }

  if ((impactScore ?? 0) >= 35) {
    return "Broader architectural changes increased the analysis signal.";
  }

  return "Signals are present, but the changed surface is still limited.";
}

export function getDecisionTypeLabel(
  decisionType: MergeReadiness["decisionType"],
): string {
  switch (decisionType) {
    case "LOW_IMPACT_SAFE":
      return "Low-impact PR";
    case "HIGH_RISK":
      return "High-risk PR";
    default:
      return "Normal decision";
  }
}

export function pluralize(
  count: number,
  singular: string,
  plural = `${singular}s`,
): string {
  return count === 1 ? singular : plural;
}

export const MERGE_STATUS_META: Record<
  MergeReadiness["status"],
  {
    label: string;
    headline: string;
    icon: LucideIcon;
    badgeClass: string;
    accentClass: string;
    barClass: string;
    chipClass: string;
    glowClass: string;
  }
> = {
  SAFE: {
    label: "Safe",
    headline: "Ready to merge",
    icon: ShieldCheck,
    badgeClass: "border-emerald-400/25 bg-emerald-400/10 text-emerald-100",
    accentClass: "text-emerald-200",
    barClass: "bg-emerald-400 shadow-[0_0_30px_-12px_rgba(52,211,153,0.8)]",
    chipClass: "border-emerald-400/20 bg-emerald-400/10 text-emerald-100",
    glowClass: "shadow-[0_30px_80px_-48px_rgba(52,211,153,0.6)]",
  },
  CAUTION: {
    label: "Caution",
    headline: "Merge with caution",
    icon: AlertTriangle,
    badgeClass: "border-amber-400/25 bg-amber-400/10 text-amber-100",
    accentClass: "text-amber-200",
    barClass: "bg-amber-400 shadow-[0_0_30px_-12px_rgba(251,191,36,0.8)]",
    chipClass: "border-amber-400/20 bg-amber-400/10 text-amber-100",
    glowClass: "shadow-[0_30px_80px_-48px_rgba(251,191,36,0.5)]",
  },
  BLOCK: {
    label: "Blocked",
    headline: "Hold merge until reviewed",
    icon: ShieldX,
    badgeClass: "border-red-400/25 bg-red-400/10 text-red-100",
    accentClass: "text-red-200",
    barClass: "bg-red-400 shadow-[0_0_30px_-12px_rgba(248,113,113,0.82)]",
    chipClass: "border-red-400/20 bg-red-400/10 text-red-100",
    glowClass: "shadow-[0_30px_80px_-48px_rgba(248,113,113,0.55)]",
  },
};

export const RISK_LEVEL_META: Record<
  RiskLevel,
  {
    label: string;
    badgeClass: string;
    accentClass: string;
  }
> = {
  LOW: {
    label: "Low risk",
    badgeClass: "border-emerald-400/20 bg-emerald-400/10 text-emerald-100",
    accentClass: "text-emerald-200",
  },
  MEDIUM: {
    label: "Moderate risk",
    badgeClass: "border-amber-400/20 bg-amber-400/10 text-amber-100",
    accentClass: "text-amber-200",
  },
  HIGH: {
    label: "High risk",
    badgeClass: "border-red-400/20 bg-red-400/10 text-red-100",
    accentClass: "text-red-200",
  },
};

export const ISSUE_TYPE_META: Record<
  IssueType,
  {
    label: string;
    icon: LucideIcon;
    toneClass: string;
    badgeClass: string;
    iconClass: string;
  }
> = {
  bug: {
    label: "Bug",
    icon: Bug,
    toneClass: "border-sky-400/18 bg-sky-400/[0.07]",
    badgeClass: "border-sky-400/20 bg-sky-400/10 text-sky-100",
    iconClass: "text-sky-200",
  },
  security: {
    label: "Security",
    icon: ShieldAlert,
    toneClass: "border-red-400/18 bg-red-400/[0.07]",
    badgeClass: "border-red-400/20 bg-red-400/10 text-red-100",
    iconClass: "text-red-200",
  },
  performance: {
    label: "Performance",
    icon: Zap,
    toneClass: "border-amber-400/18 bg-amber-400/[0.07]",
    badgeClass: "border-amber-400/20 bg-amber-400/10 text-amber-100",
    iconClass: "text-amber-200",
  },
  maintainability: {
    label: "Maintainability",
    icon: Wrench,
    toneClass: "border-teal-400/18 bg-teal-400/[0.07]",
    badgeClass: "border-teal-400/20 bg-teal-400/10 text-teal-100",
    iconClass: "text-teal-200",
  },
};

export const SEVERITY_META: Record<
  IssueSeverity,
  {
    label: string;
    badgeClass: string;
    barTone: "safe" | "caution" | "block" | "primary";
    accentClass: string;
  }
> = {
  LOW: {
    label: "Low",
    badgeClass: "border-sky-400/20 bg-sky-400/10 text-sky-100",
    barTone: "primary",
    accentClass: "text-sky-200",
  },
  MEDIUM: {
    label: "Medium",
    badgeClass: "border-amber-400/20 bg-amber-400/10 text-amber-100",
    barTone: "caution",
    accentClass: "text-amber-200",
  },
  HIGH: {
    label: "High",
    badgeClass: "border-red-400/20 bg-red-400/10 text-red-100",
    barTone: "block",
    accentClass: "text-red-200",
  },
};

export const SEVERITY_RANK: Record<IssueSeverity, number> = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
};

export function getLayerPalette(layer: string): {
  fill: string;
  softClass: string;
  textClass: string;
  dotClass: string;
  chipClass: string;
} {
  switch (layer) {
    case "API":
      return {
        fill: "#38bdf8",
        softClass: "border-cyan-400/18 bg-cyan-400/10",
        textClass: "text-cyan-100",
        dotClass: "bg-cyan-300",
        chipClass: "border-cyan-400/20 bg-cyan-400/10 text-cyan-100",
      };
    case "Service":
      return {
        fill: "#2dd4bf",
        softClass: "border-teal-400/18 bg-teal-400/10",
        textClass: "text-teal-100",
        dotClass: "bg-teal-300",
        chipClass: "border-teal-400/20 bg-teal-400/10 text-teal-100",
      };
    case "Domain":
      return {
        fill: "#fbbf24",
        softClass: "border-amber-400/18 bg-amber-400/10",
        textClass: "text-amber-100",
        dotClass: "bg-amber-300",
        chipClass: "border-amber-400/20 bg-amber-400/10 text-amber-100",
      };
    case "Middleware":
      return {
        fill: "#f87171",
        softClass: "border-red-400/18 bg-red-400/10",
        textClass: "text-red-100",
        dotClass: "bg-red-300",
        chipClass: "border-red-400/20 bg-red-400/10 text-red-100",
      };
    case "UI":
      return {
        fill: "#67e8f9",
        softClass: "border-sky-400/18 bg-sky-400/10",
        textClass: "text-sky-100",
        dotClass: "bg-sky-300",
        chipClass: "border-sky-400/20 bg-sky-400/10 text-sky-100",
      };
    default:
      return {
        fill: "#94a3b8",
        softClass: "border-slate-400/18 bg-slate-400/10",
        textClass: "text-slate-100",
        dotClass: "bg-slate-300",
        chipClass: "border-slate-400/20 bg-slate-400/10 text-slate-100",
      };
  }
}
