import { Gauge } from "lucide-react";
import type { IssueSeverity, PRAnalysisWithRiskScore } from "@/app/types/prAnalysis";
import AnimatedProgressBar, { type ProgressTone } from "./AnimatedProgressBar";
import DashboardCard from "./DashboardCard";
import { RISK_LEVEL_META, SEVERITY_META, cx } from "./dashboardUtils";

type RiskCardProps = {
  analysis: PRAnalysisWithRiskScore;
  finalRiskLevel: "LOW" | "MEDIUM" | "HIGH";
};

export default function RiskCard({ analysis, finalRiskLevel }: RiskCardProps) {
  const severityCounts: Record<IssueSeverity, number> = {
    LOW: 0,
    MEDIUM: 0,
    HIGH: 0,
  };

  analysis.issues.forEach((issue) => {
    severityCounts[issue.severity] += 1;
  });

  const overallTone: ProgressTone =
    finalRiskLevel === "HIGH"
      ? "block"
      : finalRiskLevel === "MEDIUM"
        ? "caution"
        : "safe";

  const bars: Array<{ label: string; value: number; tone: ProgressTone }> = [
    {
      label: "Diff surface risk",
      value: analysis.riskScoreBreakdown.diffSizeRisk * 100,
      tone: "primary" as const,
    },
    {
      label: "Issue density risk",
      value: analysis.riskScoreBreakdown.issueCountRisk * 100,
      tone: "caution" as const,
    },
    {
      label: "Severity pressure",
      value: analysis.riskScoreBreakdown.issueSeverityRisk * 100,
      tone: "block" as const,
    },
    {
      label: "Overall score",
      value: analysis.riskScoreBreakdown.finalRiskScore,
      tone: overallTone,
    },
  ];

  const riskMeta = RISK_LEVEL_META[finalRiskLevel];

  return (
    <DashboardCard
      title="Risk Breakdown"
      eyebrow="Secondary Signal"
      description="Weighted inputs that shape the final recommendation."
      icon={Gauge}
      headerSlot={
        <span
          className={cx(
            "inline-flex rounded-full border px-3 py-1 text-xs font-medium",
            riskMeta.badgeClass,
          )}
        >
          {riskMeta.label}
        </span>
      }
    >
      <div className="space-y-6">
        <div className="space-y-4">
          {bars.map((bar, index) => (
            <AnimatedProgressBar
              key={bar.label}
              label={bar.label}
              value={bar.value}
              tone={bar.tone}
              delay={index * 0.08}
            />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3">
          {(["LOW", "MEDIUM", "HIGH"] as IssueSeverity[]).map((severity) => {
            const meta = SEVERITY_META[severity];

            return (
              <div
                key={severity}
                className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4"
              >
                <span
                  className={cx(
                    "inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium",
                    meta.badgeClass,
                  )}
                >
                  {meta.label}
                </span>
                <p className={cx("mt-4 text-2xl font-semibold", meta.accentClass)}>
                  {severityCounts[severity]}
                </p>
                <p className="mt-1 text-xs text-slate-500">findings</p>
              </div>
            );
          })}
        </div>

        <div className="rounded-[24px] border border-white/10 bg-slate-950/35 p-4">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
            Analyst rationale
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            {analysis.riskScoreBreakdown.rationale}
          </p>
        </div>
      </div>
    </DashboardCard>
  );
}
