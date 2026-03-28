import { motion } from "framer-motion";
import { clampPercentage, cx } from "./dashboardUtils";

export type ProgressTone = "safe" | "caution" | "block" | "primary" | "muted";

type AnimatedProgressBarProps = {
  label: string;
  value: number;
  hint?: string;
  tone?: ProgressTone;
  showValue?: boolean;
  delay?: number;
  size?: "sm" | "md";
  className?: string;
};

const toneClasses: Record<ProgressTone, string> = {
  safe: "bg-emerald-400 shadow-[0_0_28px_-12px_rgba(52,211,153,0.8)]",
  caution: "bg-amber-400 shadow-[0_0_28px_-12px_rgba(251,191,36,0.75)]",
  block: "bg-red-400 shadow-[0_0_28px_-12px_rgba(248,113,113,0.78)]",
  primary: "bg-cyan-400 shadow-[0_0_28px_-12px_rgba(56,189,248,0.82)]",
  muted: "bg-slate-400 shadow-[0_0_28px_-14px_rgba(148,163,184,0.6)]",
};

export default function AnimatedProgressBar({
  label,
  value,
  hint,
  tone = "primary",
  showValue = true,
  delay = 0,
  size = "md",
  className,
}: AnimatedProgressBarProps) {
  const percentage = clampPercentage(value);

  return (
    <div className={cx("space-y-2", className)}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-slate-200">{label}</span>
        {showValue ? (
          <span className="text-sm font-medium text-slate-400">
            {Math.round(percentage)}%
          </span>
        ) : null}
      </div>

      <div
        className={cx(
          "overflow-hidden rounded-full bg-white/[0.06]",
          size === "sm" ? "h-2" : "h-3",
        )}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{
            duration: 0.85,
            delay,
            ease: [0.16, 1, 0.3, 1],
          }}
          className={cx("h-full rounded-full", toneClasses[tone])}
        />
      </div>

      {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}
