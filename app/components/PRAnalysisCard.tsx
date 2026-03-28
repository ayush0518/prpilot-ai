"use client";

import { motion } from "framer-motion";
import { LoaderCircle } from "lucide-react";
import type {
  BlastRadius,
  ComplianceResult,
  MergeReadiness,
  PRAnalysisWithRiskScore,
} from "@/app/types/prAnalysis";
import BlastRadiusGraph from "./dashboard/BlastRadiusGraph";
import ComplianceCard from "./dashboard/ComplianceCard";
import ImprovementsCard from "./dashboard/ImprovementsCard";
import RepositoryImpactCard from "./dashboard/RepositoryImpactCard";
import RiskCard from "./dashboard/RiskCard";
import RisksCard from "./dashboard/RisksCard";
import VerdictCard from "./dashboard/VerdictCard";

interface PRAnalysisCardProps {
  analysis: PRAnalysisWithRiskScore;
  finalRiskLevel: "LOW" | "MEDIUM" | "HIGH";
  mergeReadiness: MergeReadiness;
  isLoading?: boolean;
  repositoryData?: {
    changedFiles: string[];
    totalFiles: number;
  };
  blastRadius?: BlastRadius | null;
  compliance?: ComplianceResult | null;
  onRetry?: () => void;
}

const staggerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.04,
    },
  },
};

export default function PRAnalysisCard({
  analysis,
  finalRiskLevel,
  mergeReadiness,
  isLoading = false,
  repositoryData,
  blastRadius,
  compliance,
}: PRAnalysisCardProps) {
  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="dashboard-card rounded-[32px] p-10"
      >
        <div className="flex min-h-[260px] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-400/10 text-cyan-100 shadow-[0_0_55px_-28px_rgba(56,189,248,0.75)]">
              <LoaderCircle className="size-7 animate-spin" />
            </div>
            <p className="mt-5 text-lg font-medium text-white">
              Refreshing the dashboard
            </p>
            <p className="mt-2 text-sm text-slate-400">
              Recomputing merge verdict, blast radius, and review signals.
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={staggerVariants}
      className="space-y-6"
    >
      <VerdictCard
        analysis={analysis}
        finalRiskLevel={finalRiskLevel}
        mergeReadiness={mergeReadiness}
        repositoryData={repositoryData}
        blastRadius={blastRadius}
        compliance={compliance}
      />

      <BlastRadiusGraph blastRadius={blastRadius} />

      <motion.div
        variants={staggerVariants}
        className="grid gap-6 xl:grid-cols-[1fr_1fr]"
      >
        <RiskCard analysis={analysis} finalRiskLevel={finalRiskLevel} />
        <ComplianceCard compliance={compliance} />
      </motion.div>

      <motion.div
        variants={staggerVariants}
        className="grid gap-6 xl:grid-cols-[1.34fr_0.96fr]"
      >
        <RisksCard issues={analysis.issues} />
        <ImprovementsCard improvements={analysis.improvements} />
      </motion.div>

      <motion.div variants={staggerVariants}>
        <RepositoryImpactCard
          repositoryData={repositoryData}
          blastRadius={blastRadius}
        />
      </motion.div>
    </motion.div>
  );
}
