import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { IssueType, PRIssue } from "@/app/types/prAnalysis";
import DashboardCard from "./DashboardCard";
import {
  ISSUE_TYPE_META,
  SEVERITY_META,
  SEVERITY_RANK,
  cx,
} from "./dashboardUtils";

type RisksCardProps = {
  issues: PRIssue[];
};

export default function RisksCard({ issues }: RisksCardProps) {
  const typeCounts: Record<IssueType, number> = {
    bug: 0,
    security: 0,
    performance: 0,
    maintainability: 0,
  };

  issues.forEach((issue) => {
    typeCounts[issue.type] += 1;
  });

  const sortedIssues = [...issues].sort(
    (left, right) => SEVERITY_RANK[right.severity] - SEVERITY_RANK[left.severity],
  );

  return (
    <DashboardCard
      title="Risks"
      eyebrow="Review Findings"
      description="Concrete issues surfaced by the analysis."
      icon={AlertTriangle}
      headerSlot={
        <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-slate-200">
          {issues.length} finding{issues.length === 1 ? "" : "s"}
        </span>
      }
    >
      {issues.length === 0 ? (
        <div className="grid min-h-[320px] place-items-center rounded-[24px] border border-emerald-400/18 bg-emerald-400/[0.08] p-6 text-center">
          <div>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-400/18 bg-emerald-400/10 text-emerald-100">
              <CheckCircle2 className="size-6" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-white">
              No major risks detected
            </h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-emerald-100/80">
              This PR did not surface notable issues across the current analysis
              heuristics.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(typeCounts) as IssueType[])
              .filter((type) => typeCounts[type] > 0)
              .map((type) => {
                const meta = ISSUE_TYPE_META[type];

                return (
                  <span
                    key={type}
                    className={cx(
                      "inline-flex rounded-full border px-3 py-1 text-xs font-medium",
                      meta.badgeClass,
                    )}
                  >
                    {meta.label}: {typeCounts[type]}
                  </span>
                );
              })}
          </div>

          <div className="dashboard-scroll max-h-[480px] space-y-3 overflow-y-auto pr-1">
            {sortedIssues.map((issue, index) => {
              const typeMeta = ISSUE_TYPE_META[issue.type];
              const severityMeta = SEVERITY_META[issue.severity];
              const Icon = typeMeta.icon;

              return (
                <motion.div
                  key={`${issue.file}-${issue.description}-${index}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.35,
                    delay: index * 0.04,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className={cx(
                    "rounded-[24px] border p-4",
                    typeMeta.toneClass,
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-2">
                        <Icon className={cx("size-4", typeMeta.iconClass)} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={cx(
                              "inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium",
                              severityMeta.badgeClass,
                            )}
                          >
                            {issue.severity}
                          </span>
                          <p className="text-sm font-medium leading-6 text-white">
                            {issue.description}
                          </p>
                        </div>
                        <p className="mt-2 break-all font-mono text-xs text-slate-500">
                          {issue.file}
                        </p>
                      </div>
                    </div>

                    <span
                      className={cx(
                        "inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium",
                        typeMeta.badgeClass,
                      )}
                    >
                      {typeMeta.label}
                    </span>
                  </div>

                  <div className="mt-4 rounded-[20px] border border-white/10 bg-slate-950/35 p-4">
                    <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                      Suggested action
                    </p>
                    <p className="mt-3 text-sm leading-6 text-slate-300">
                      {issue.suggestion}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </DashboardCard>
  );
}
