import {
  Activity,
  CheckCircle2,
  Clock3,
  Layers3,
  Sparkles,
} from "lucide-react";
import type {
  BlastRadius,
  ComplianceResult,
  MergeReadiness,
  PRAnalysisWithRiskScore,
} from "@/app/types/prAnalysis";
import AnimatedProgressBar from "./AnimatedProgressBar";
import DashboardCard from "./DashboardCard";
import {
  MERGE_STATUS_META,
  RISK_LEVEL_META,
  cx,
  formatPercentLabel,
  getDecisionConfidenceLabel,
  getSignalStrengthLabel,
  getSignalStrengthReason,
} from "./dashboardUtils";

type RepositoryData = {
  changedFiles: string[];
  totalFiles: number;
};

type VerdictCardProps = {
  analysis: PRAnalysisWithRiskScore;
  finalRiskLevel: "LOW" | "MEDIUM" | "HIGH";
  mergeReadiness: MergeReadiness;
  repositoryData?: RepositoryData;
  blastRadius?: BlastRadius | null;
  compliance?: ComplianceResult | null;
};

type HeroMetricProps = {
  icon: typeof Activity;
  label: string;
  value: string;
  hint: string;
  accentClass: string;
};

function HeroMetric({
  icon: Icon,
  label,
  value,
  hint,
  accentClass,
}: HeroMetricProps) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-slate-950/35 p-5 shadow-[0_24px_40px_-34px_rgba(15,23,42,0.95)]">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-slate-300">{label}</span>
        <Icon className={cx("size-4", accentClass)} />
      </div>
      <p className={cx("mt-4 text-3xl font-semibold tracking-tight", accentClass)}>
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{hint}</p>
    </div>
  );
}

function inferPRType(
  files: string[],
  blastRadius?: BlastRadius | null,
  summary?: string,
): { label: string; detail: string } {
  const loweredFiles = files.map((file) => file.toLowerCase());
  const docConfigPattern =
    /(^|\/)(docs?|\.github|config|configs|settings)(\/|$)|\.(md|mdx|json|ya?ml|toml|ini|env|txt|lock)$/i;
  const featurePattern =
    /(^|\/)(api|routes?|services?|controllers?|handlers?|endpoints?)(\/|$)|route\.(ts|tsx|js|jsx)$/i;
  const refactorPattern = /(refactor|cleanup|restructure|rename)/i;
  const layers = blastRadius?.affectedLayers ?? [];

  if (files.length > 0 && files.every((file) => docConfigPattern.test(file))) {
    return {
      label: "Documentation / Config",
      detail: "Minimal non-runtime changes",
    };
  }

  if (
    loweredFiles.some((file) => featurePattern.test(file)) ||
    layers.includes("API") ||
    layers.includes("Service")
  ) {
    const layerSummary =
      layers.length > 0 ? `${layers.join(" + ")} changes` : "API + Service changes";

    return {
      label: "Feature",
      detail: layerSummary,
    };
  }

  if (
    refactorPattern.test(summary ?? "") ||
    loweredFiles.some((file) => refactorPattern.test(file))
  ) {
    return {
      label: "Refactor",
      detail: "Structure and maintainability updates",
    };
  }

  return {
    label: "Refactor",
    detail: layers.length > 0 ? `${layers.join(" + ")} updates` : "Internal code changes",
  };
}

function estimateReviewTime(fileCount: number): string {
  if (fileCount < 3) {
    return "1-2 mins";
  }

  if (fileCount <= 7) {
    return "3-7 mins";
  }

  return "10+ mins";
}

function getVerdictHeadline(mergeReadiness: MergeReadiness): string {
  if (mergeReadiness.decisionType === "LOW_IMPACT_SAFE") {
    return "Low-impact PR detected — safe to merge";
  }

  if (
    mergeReadiness.decisionType === "HIGH_RISK" ||
    mergeReadiness.status === "BLOCK"
  ) {
    return "High-risk change detected — review critical areas before merging";
  }

  if (mergeReadiness.status === "CAUTION") {
    return "Moderate risk detected — review key files before merging";
  }

  return "Low-risk change detected — safe to merge";
}

function getActionLine(
  mergeReadiness: MergeReadiness,
  blastRadius?: BlastRadius | null,
): string {
  const layers = blastRadius?.affectedLayers ?? [];
  const layerSummary = layers.join(" + ");

  if (mergeReadiness.decisionType === "LOW_IMPACT_SAFE") {
    return "Safe to merge — optional review";
  }

  if (layers.length > 0) {
    return `Review ${layerSummary} layer changes before merging`;
  }

  if (
    mergeReadiness.decisionType === "HIGH_RISK" ||
    mergeReadiness.status === "BLOCK"
  ) {
    return "Review critical areas before merging";
  }

  if (mergeReadiness.status === "CAUTION") {
    return "Review key files before merging";
  }

  return "Safe to merge";
}

function getRiskTag(mergeReadiness: MergeReadiness): string {
  if (
    mergeReadiness.decisionType === "HIGH_RISK" ||
    mergeReadiness.status === "BLOCK"
  ) {
    return "High risk";
  }

  if (mergeReadiness.status === "CAUTION") {
    return "Needs review";
  }

  return "Safe";
}

function getImpactTag(impactScore?: number): string {
  if ((impactScore ?? 0) >= 60) {
    return "High impact";
  }

  if ((impactScore ?? 0) >= 25) {
    return "Moderate impact";
  }

  return "Low impact";
}

function getWhyVerdictItems(
  repositoryData: RepositoryData | undefined,
  blastRadius: BlastRadius | null | undefined,
  compliance: ComplianceResult | null | undefined,
): string[] {
  const totalFiles = repositoryData?.totalFiles ?? repositoryData?.changedFiles.length ?? 0;
  const layers = blastRadius?.affectedLayers ?? [];
  const activeFlags = compliance
    ? Object.entries(compliance.flags)
        .filter(([, value]) => value)
        .map(([key]) => {
          switch (key) {
            case "auth":
              return "Authentication";
            case "payment":
              return "Payment";
            case "pii":
              return "PII";
            default:
              return "Security";
          }
        })
    : [];

  const items: string[] = [];

  if (layers.length > 0) {
    items.push(
      `${layers.join(" + ")} layer${layers.length > 1 ? "s" : ""} modified`,
    );
  }

  if (totalFiles > 7) {
    items.push(`${totalFiles} files changed (broad impact)`);
  } else if (totalFiles >= 3) {
    items.push(`${totalFiles} files changed (moderate impact)`);
  } else if (totalFiles > 0) {
    items.push(`${totalFiles} file${totalFiles === 1 ? "" : "s"} changed (focused impact)`);
  }

  if (activeFlags.length > 0) {
    items.push(`Sensitive areas touched: ${activeFlags.join(" + ")}`);
  } else {
    items.push("No critical security risks detected");
  }

  return items.slice(0, 3);
}

export default function VerdictCard({
  analysis,
  finalRiskLevel,
  mergeReadiness,
  repositoryData,
  blastRadius,
  compliance,
}: VerdictCardProps) {
  const statusMeta = MERGE_STATUS_META[mergeReadiness.status];
  const riskMeta = RISK_LEVEL_META[finalRiskLevel];
  const StatusIcon = statusMeta.icon;
  const decisionConfidenceLabel = getDecisionConfidenceLabel(mergeReadiness);
  const actionLine = getActionLine(mergeReadiness, blastRadius);
  const signalStrengthLabel = getSignalStrengthLabel(mergeReadiness.signalStrength);
  const prType = inferPRType(
    repositoryData?.changedFiles ?? [],
    blastRadius,
    analysis.summary,
  );
  const reviewTime = estimateReviewTime(repositoryData?.changedFiles.length ?? 0);
  const whyVerdictItems = getWhyVerdictItems(
    repositoryData,
    blastRadius,
    compliance,
  );
  const decisionHighlights = [
    getRiskTag(mergeReadiness),
    prType.label,
    getImpactTag(blastRadius?.impactScore),
  ];

  return (
    <DashboardCard
      title="Merge Verdict"
      eyebrow="Primary Signal"
      description="Verdict, action, and decision confidence at a glance."
      icon={StatusIcon}
      className={cx(statusMeta.glowClass, "overflow-hidden")}
      headerSlot={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span
            className={cx(
              "inline-flex rounded-full border px-3 py-1 text-xs font-medium",
              statusMeta.chipClass,
            )}
          >
            {statusMeta.label}
          </span>
          <span
            className={cx(
              "inline-flex rounded-full border px-3 py-1 text-xs font-medium",
              riskMeta.badgeClass,
            )}
          >
            {riskMeta.label}
          </span>
        </div>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.48fr)_360px]">
        <div className="space-y-6">
          <div className="space-y-4">
            <div
              className={cx(
                "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium",
                statusMeta.badgeClass,
              )}
            >
              <StatusIcon className="size-4" />
              {mergeReadiness.decisionType === "LOW_IMPACT_SAFE"
                ? "Safe to merge"
                : statusMeta.headline}
            </div>

            <div className="space-y-3">
              <h3 className="max-w-4xl text-[2.65rem] font-semibold tracking-tight text-white">
                {getVerdictHeadline(mergeReadiness)}
              </h3>
              <p className="max-w-3xl text-base leading-7 text-slate-300">
                {analysis.summary}
              </p>
              <p className="text-base font-medium text-slate-100">
                Action: {actionLine}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {decisionHighlights.map((item) => (
              <span
                key={item}
                className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm font-medium text-slate-200"
              >
                {item}
              </span>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-2 text-slate-100">
                  <Layers3 className="size-4" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                    PR type
                  </p>
                  <p className="mt-2 text-xl font-semibold text-white">{prType.label}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-400">
                    {prType.detail}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-2 text-slate-100">
                  <Clock3 className="size-4" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                    Estimated review time
                  </p>
                  <p className="mt-2 text-xl font-semibold text-white">{reviewTime}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-400">
                    Based on the number of changed files in this pull request.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-slate-950/35 p-5 shadow-inner shadow-black/20">
            <AnimatedProgressBar
              label="Merge risk score"
              value={mergeReadiness.score}
              tone={
                mergeReadiness.status === "SAFE"
                  ? "safe"
                  : mergeReadiness.status === "CAUTION"
                    ? "caution"
                    : "block"
              }
            />
            <div className="mt-5 flex flex-wrap items-end gap-3">
              <span className={cx("text-4xl font-semibold", statusMeta.accentClass)}>
                {mergeReadiness.score}
              </span>
              <span className="pb-1 text-sm text-slate-500">out of 100</span>
            </div>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-2 text-slate-100">
                <Sparkles className="size-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Why this verdict?</p>
                <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">
                  Decision rationale
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {whyVerdictItems.map((item) => (
                <div
                  key={item}
                  className="rounded-[20px] border border-white/10 bg-slate-950/35 p-4 text-sm leading-6 text-slate-200"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <HeroMetric
            icon={Activity}
            label="Decision Confidence"
            value={formatPercentLabel(mergeReadiness.decisionConfidence)}
            hint={decisionConfidenceLabel}
            accentClass="text-cyan-200"
          />
          <HeroMetric
            icon={Sparkles}
            label="Signal Strength"
            value={signalStrengthLabel}
            hint={getSignalStrengthReason(
              mergeReadiness,
              analysis.issues.length,
              blastRadius?.impactScore,
            )}
            accentClass="text-teal-200"
          />
          <HeroMetric
            icon={Clock3}
            label="Review Effort"
            value={reviewTime}
            hint={prType.detail}
            accentClass="text-slate-100"
          />
          <HeroMetric
            icon={CheckCircle2}
            label="Issues Detected"
            value={`${analysis.issues.length}`}
            hint={
              analysis.issues.length === 0
                ? "No risks found."
                : "Review findings surfaced for this PR."
            }
            accentClass="text-emerald-200"
          />
        </div>
      </div>
    </DashboardCard>
  );
}
