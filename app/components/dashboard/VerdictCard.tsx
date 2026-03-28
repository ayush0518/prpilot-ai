import { Activity, CheckCircle2, Sparkles } from "lucide-react";
import type {
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
  getActionText,
  getDecisionConfidenceLabel,
  getDecisionTypeLabel,
} from "./dashboardUtils";

type VerdictCardProps = {
  analysis: PRAnalysisWithRiskScore;
  finalRiskLevel: "LOW" | "MEDIUM" | "HIGH";
  mergeReadiness: MergeReadiness;
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

export default function VerdictCard({
  analysis,
  finalRiskLevel,
  mergeReadiness,
}: VerdictCardProps) {
  const statusMeta = MERGE_STATUS_META[mergeReadiness.status];
  const riskMeta = RISK_LEVEL_META[finalRiskLevel];
  const StatusIcon = statusMeta.icon;
  const decisionConfidenceLabel = getDecisionConfidenceLabel(mergeReadiness);
  const actionText = getActionText(mergeReadiness);
  const decisionTypeLabel = getDecisionTypeLabel(mergeReadiness.decisionType);
  const decisionHighlights =
    mergeReadiness.decisionType === "LOW_IMPACT_SAFE"
      ? [
          "High confidence decision",
          "Low-impact PR",
          "No risks found",
        ]
      : [
          decisionConfidenceLabel,
          decisionTypeLabel,
          actionText,
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
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_320px]">
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
              <h3 className="max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-[2.55rem]">
                {mergeReadiness.reason}
              </h3>
              <p className="max-w-2xl text-base leading-7 text-slate-300">
                {analysis.summary}
              </p>
              <p className="text-base font-medium text-slate-100">
                Action: {actionText}
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
        </div>

        <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
          <HeroMetric
            icon={Activity}
            label="Decision Confidence"
            value={formatPercentLabel(mergeReadiness.decisionConfidence)}
            hint={decisionConfidenceLabel}
            accentClass="text-cyan-200"
          />
          <HeroMetric
            icon={CheckCircle2}
            label="Decision Type"
            value={decisionTypeLabel}
            hint={
              mergeReadiness.decisionType === "LOW_IMPACT_SAFE"
                ? "Low-impact PR."
                : mergeReadiness.decisionType === "HIGH_RISK"
                  ? "Escalated review path."
                  : "Standard merge decision flow."
            }
            accentClass="text-slate-100"
          />
          <HeroMetric
            icon={Sparkles}
            label="Issues Detected"
            value={`${analysis.issues.length}`}
            hint={
              analysis.issues.length === 0
                ? "No risks found."
                : "Review findings surfaced for this PR."
            }
            accentClass="text-teal-200"
          />
        </div>
      </div>
    </DashboardCard>
  );
}
