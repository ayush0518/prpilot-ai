import { motion, type Variants } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cx } from "./dashboardUtils";

export const dashboardCardVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
    },
  },
};

type DashboardCardProps = {
  title: string;
  icon?: LucideIcon;
  description?: string;
  eyebrow?: string;
  headerSlot?: ReactNode;
  className?: string;
  hover?: boolean;
  children: ReactNode;
};

export default function DashboardCard({
  title,
  icon: Icon,
  description,
  eyebrow,
  headerSlot,
  className,
  hover = true,
  children,
}: DashboardCardProps) {
  return (
    <motion.section
      variants={dashboardCardVariants}
      initial={false}
      whileHover={hover ? { y: -4 } : undefined}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cx("dashboard-card rounded-[28px] p-6 sm:p-7", className)}
    >
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {eyebrow ? (
              <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-slate-500">
                {eyebrow}
              </p>
            ) : null}

            <div className="mt-2 flex items-start gap-3">
              {Icon ? (
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-slate-100">
                  <Icon className="size-5" />
                </div>
              ) : null}

              <div className="min-w-0">
                <h2 className="text-xl font-semibold tracking-tight text-white">
                  {title}
                </h2>
                {description ? (
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    {description}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          {headerSlot ? <div className="shrink-0">{headerSlot}</div> : null}
        </div>

        <div className="mt-6">{children}</div>
      </div>
    </motion.section>
  );
}
