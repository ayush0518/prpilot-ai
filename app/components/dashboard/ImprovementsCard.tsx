import { motion } from "framer-motion";
import { CheckCircle2, Sparkles } from "lucide-react";
import DashboardCard from "./DashboardCard";

type ImprovementsCardProps = {
  improvements: string[];
};

export default function ImprovementsCard({
  improvements,
}: ImprovementsCardProps) {
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
          {improvements.map((improvement, index) => (
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
                <p className="text-sm leading-6 text-slate-200">{improvement}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </DashboardCard>
  );
}
