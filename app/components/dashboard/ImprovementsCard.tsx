import { motion } from "framer-motion";
import { CheckCircle2, Sparkles } from "lucide-react";
import DashboardCard from "./DashboardCard";
import { cx } from "./dashboardUtils";

type ImprovementsCardProps = {
  improvements: string[];
};

type ImprovementPriority = "HIGH" | "MEDIUM" | "LOW";

function getImprovementPriority(improvement: string): ImprovementPriority {
  const normalized = improvement.toLowerCase();

  if (
    /(error|exception|security|auth|payment|validation|sanitize|crash|failure|retry|guard|api|response|endpoint)/.test(
      normalized,
    )
  ) {
    return "HIGH";
  }

  if (
    /(logging|tests?|refactor|performance|monitor|observability|clarify|cleanup|fallback)/.test(
      normalized,
    )
  ) {
    return "MEDIUM";
  }

  return "LOW";
}

function getPriorityRank(priority: ImprovementPriority): number {
  switch (priority) {
    case "HIGH":
      return 0;
    case "MEDIUM":
      return 1;
    default:
      return 2;
  }
}

function getPriorityClasses(priority: ImprovementPriority): string {
  switch (priority) {
    case "HIGH":
      return "border-red-400/20 bg-red-400/10 text-red-100";
    case "MEDIUM":
      return "border-amber-400/20 bg-amber-400/10 text-amber-100";
    default:
      return "border-sky-400/20 bg-sky-400/10 text-sky-100";
  }
}

export default function ImprovementsCard({
  improvements,
}: ImprovementsCardProps) {
  const orderedImprovements = improvements
    .map((improvement, index) => ({
      improvement,
      priority: getImprovementPriority(improvement),
      index,
    }))
    .sort((left, right) => {
      const rankDiff =
        getPriorityRank(left.priority) - getPriorityRank(right.priority);

      if (rankDiff !== 0) {
        return rankDiff;
      }

      return left.index - right.index;
    });

  return (
    <DashboardCard
      title="Improvements"
      eyebrow="Suggested Follow-up"
      description="Practical changes that can strengthen the PR before merge."
      icon={Sparkles}
      headerSlot={
        <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-slate-200">
          {improvements.length} idea{improvements.length === 1 ? "" : "s"}
        </span>
      }
    >
      {improvements.length === 0 ? (
        <div className="grid min-h-[320px] place-items-center rounded-[24px] border border-white/10 bg-white/[0.03] p-6 text-center">
          <div>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-slate-100">
              <CheckCircle2 className="size-6" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-white">
              No extra improvements suggested
            </h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">
              The current analysis does not recommend additional polish beyond
              addressing surfaced risks.
            </p>
          </div>
        </div>
      ) : (
        <div className="dashboard-scroll max-h-[480px] space-y-3 overflow-y-auto pr-1">
          {orderedImprovements.map(({ improvement, priority }, index) => {

            return (
              <motion.div
                key={`${improvement}-${index}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.35,
                  delay: index * 0.05,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-teal-400/20 bg-teal-400/10 text-teal-100">
                    <Sparkles className="size-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <span
                      className={cx(
                        "inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium",
                        getPriorityClasses(priority),
                      )}
                    >
                      {priority}
                    </span>
                    <p className="mt-3 text-sm leading-6 text-slate-200">{improvement}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </DashboardCard>
  );
}
