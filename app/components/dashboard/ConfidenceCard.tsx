import { Activity } from "lucide-react";
import type {
  BlastRadius,
  MergeReadiness,
  PRAnalysisWithRiskScore,
} from "@/app/types/prAnalysis";
import AnimatedProgressBar from "./AnimatedProgressBar";
import DashboardCard from "./DashboardCard";
import {
  MERGE_STATUS_META,
  confidenceToPercent,
  formatPercentLabel,
  getActionText,
  getDecisionConfidenceLabel,
  getDecisionTypeLabel,
  getSignalStrengthLabel,
  getSignalStrengthReason,
} from "./dashboardUtils";

type ConfidenceCardProps = {
  analysis: PRAnalysisWithRiskScore;
  mergeReadiness: MergeReadiness;
  blastRadius?: BlastRadius | null;
};

export default function ConfidenceCard({
  analysis,
  mergeReadiness,
  blastRadius,
}: ConfidenceCardProps) {
  const decisionConfidencePercent = confidenceToPercent(
    mergeReadiness.decisionConfidence,
  );
  const decisionConfidenceLabel = getDecisionConfidenceLabel(mergeReadiness);
  const signalStrengthLabel = getSignalStrengthLabel(mergeReadiness.signalStrength);
  const actionText = getActionText(mergeReadiness);
  const mergeStatusMeta = MERGE_STATUS_META[mergeReadiness.status];

  const supportingSignals = [
    {
      label: "Merge status",
      value: mergeReadiness.status,
      tone: mergeStatusMeta.chipClass,
    },
    {
      label: "Decision type",
      value: getDecisionTypeLabel(mergeReadiness.decisionType),
      tone: "border-cyan-400/20 bg-cyan-400/10 text-cyan-100",
    },
    {
      label: "Blast radius",
      value: blastRadius ? `${blastRadius.impactScore}/100` : "Pending",
      tone: "border-white/10 bg-white/[0.04] text-slate-100",
    },
  ];

  return (
    <DashboardCard
      title="Decision Confidence"
      eyebrow="Decision Clarity"
      description="How strongly the system stands behind the merge recommendation."
      icon={Activity}
      headerSlot={
        <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-slate-200">
          {decisionConfidenceLabel}
        </span>
      }
    >
      <div className="space-y-6">
        <div className="rounded-[24px] border border-white/10 bg-slate-950/35 p-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                Decision confidence
              </p>
              <p className="mt-4 text-4xl font-semibold tracking-tight text-white">
                {formatPercentLabel(mergeReadiness.decisionConfidence)}
              </p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-slate-200">
              {decisionConfidenceLabel}
            </span>
          </div>

          <AnimatedProgressBar
            label="Decision confidence"
            value={decisionConfidencePercent}
            tone={
              mergeReadiness.decisionType === "HIGH_RISK"
                ? "block"
                : mergeReadiness.decisionType === "LOW_IMPACT_SAFE"
                  ? "safe"
                  : mergeReadiness.status === "CAUTION"
                    ? "caution"
                    : "primary"
            }
            showValue={false}
            className="mt-5"
          />

          <p className="mt-4 text-sm leading-6 text-slate-300">
            Action: {actionText}
          </p>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                Signal strength
              </p>
              <p className="mt-4 text-3xl font-semibold tracking-tight text-white">
                {signalStrengthLabel}
              </p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-slate-200">
              {formatPercentLabel(mergeReadiness.signalStrength)}
            </span>
          </div>

          <p className="mt-4 text-sm leading-6 text-slate-300">
            Reason: {getSignalStrengthReason(
              mergeReadiness,
              analysis.issues.length,
              blastRadius?.impactScore,
            )}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
          {supportingSignals.map((signal) => (
            <div
              key={signal.label}
              className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4"
            >
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                {signal.label}
              </p>
              <span
                className={`mt-4 inline-flex rounded-full border px-3 py-1 text-sm font-medium ${signal.tone}`}
              >
                {signal.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </DashboardCard>
  );
}
