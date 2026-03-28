import { CreditCard, Lock, Shield, User } from "lucide-react";
import type { ComplianceResult } from "@/app/types/prAnalysis";
import DashboardCard from "./DashboardCard";
import { RISK_LEVEL_META, cx, pluralize } from "./dashboardUtils";

type ComplianceCardProps = {
  compliance?: ComplianceResult | null;
};

export default function ComplianceCard({ compliance }: ComplianceCardProps) {
  const signals = compliance
    ? [
        {
          key: "auth",
          label: "Authentication",
          icon: Shield,
          active: compliance.flags.auth,
          fileCount: compliance.details.authFiles.length,
        },
        {
          key: "payment",
          label: "Payment",
          icon: CreditCard,
          active: compliance.flags.payment,
          fileCount: compliance.details.paymentFiles.length,
        },
        {
          key: "pii",
          label: "PII",
          icon: User,
          active: compliance.flags.pii,
          fileCount: compliance.details.piiFiles.length,
        },
        {
          key: "security",
          label: "Security",
          icon: Lock,
          active: compliance.flags.security,
          fileCount: compliance.details.securityFiles.length,
        },
      ]
    : [];

  return (
    <DashboardCard
      title="Compliance"
      eyebrow="Protected Surface"
      description="Sensitive areas touched by this pull request."
      icon={Shield}
      headerSlot={
        compliance ? (
          <span
            className={cx(
              "inline-flex rounded-full border px-3 py-1 text-xs font-medium",
              RISK_LEVEL_META[compliance.riskLevel].badgeClass,
            )}
          >
            {RISK_LEVEL_META[compliance.riskLevel].label}
          </span>
        ) : null
      }
    >
      {!compliance ? (
        <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5 text-sm leading-6 text-slate-400">
          Compliance indicators will appear after analysis completes.
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
            {signals.map((signal) => {
              const Icon = signal.icon;
              const activeTone =
                signal.active && signal.key === "security"
                  ? "border-red-400/18 bg-red-400/10 text-red-100"
                  : signal.active
                    ? "border-amber-400/18 bg-amber-400/10 text-amber-100"
                    : "border-white/10 bg-white/[0.03] text-slate-300";

              return (
                <div
                  key={signal.key}
                  className={cx("min-w-0 rounded-[20px] border p-4", activeTone)}
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-2">
                      <Icon className="size-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="min-w-0 text-sm font-medium break-words">
                          {signal.label}
                        </p>
                        <span
                          className={cx(
                            "inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium",
                            signal.active
                              ? signal.key === "security"
                                ? "border-red-400/20 bg-red-400/10 text-red-100"
                                : "border-amber-400/20 bg-amber-400/10 text-amber-100"
                              : "border-emerald-400/20 bg-emerald-400/10 text-emerald-100",
                          )}
                        >
                          {signal.active ? "Detected" : "Clear"}
                        </span>
                      </div>

                      <p className="mt-2 text-xs text-slate-500">
                        {signal.fileCount} impacted {pluralize(signal.fileCount, "file")}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {compliance.warnings.length > 0 ? (
            <div className="rounded-[24px] border border-amber-400/18 bg-amber-400/[0.08] p-4">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-amber-100/80">
                Review flags
              </p>
              <div className="mt-3 space-y-2">
                {compliance.warnings.map((warning) => (
                  <p key={warning} className="text-sm leading-6 text-slate-200">
                    {warning}
                  </p>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-[24px] border border-emerald-400/18 bg-emerald-400/[0.08] p-4">
              <p className="text-sm leading-6 text-emerald-100">
                No sensitive compliance areas were detected in the changed files.
              </p>
            </div>
          )}
        </div>
      )}
    </DashboardCard>
  );
}
