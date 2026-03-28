"use client";

import { startTransition, useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ChartNetwork,
  GitPullRequestArrow,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";
import PRAnalysisCard from "./components/PRAnalysisCard";
import {
  BlastRadius,
  ComplianceResult,
  DecisionType,
  MergeReadiness,
  PRAnalysisWithRiskScore,
} from "@/app/types/prAnalysis";

type AnalysisResult = {
  analysis: PRAnalysisWithRiskScore;
  finalRiskLevel: "LOW" | "MEDIUM" | "HIGH";
};

type RepositoryData = {
  changedFiles: string[];
  totalFiles: number;
};

const introCards = [
  {
    title: "Verdict-first hierarchy",
    description: "Lead with the merge decision, then move through risk, impact, and supporting detail.",
    icon: ShieldCheck,
  },
  {
    title: "Blast radius mapping",
    description: "Architectural impact is visualized as a chart instead of a long text section.",
    icon: ChartNetwork,
  },
  {
    title: "PR-native workflow",
    description: "Paste a pull request URL and turn raw findings into an immersive review surface.",
    icon: GitPullRequestArrow,
  },
] as const;

function isValidGitHubPRUrl(url: string): boolean {
  const regex = /^https?:\/\/github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)\/?$/;
  return regex.test(url);
}

function clampUnitInterval(value: unknown): number {
  const numericValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  return Math.max(0, Math.min(1, numericValue));
}

function normalizeAnalysis(
  rawAnalysis: PRAnalysisWithRiskScore & { confidenceScore?: number | string },
): PRAnalysisWithRiskScore {
  return {
    ...rawAnalysis,
    signalStrength: clampUnitInterval(
      rawAnalysis.signalStrength ?? rawAnalysis.confidenceScore,
    ),
  };
}

function normalizeMergeReadiness(
  rawMergeReadiness: Partial<
    MergeReadiness & { confidenceScore?: number | string; confidenceLevel?: string }
  >,
  analysis: PRAnalysisWithRiskScore,
  blastRadius: BlastRadius | null,
  finalRiskLevel: "LOW" | "MEDIUM" | "HIGH",
): MergeReadiness {
  const impactScore = blastRadius?.impactScore ?? 0;
  const isLowImpactPR =
    (finalRiskLevel === "LOW" || analysis.riskLevel === "LOW") &&
    impactScore < 20 &&
    analysis.issues.length === 0;
  const decisionConfidence = clampUnitInterval(
    rawMergeReadiness.decisionConfidence ?? rawMergeReadiness.confidenceScore ?? analysis.signalStrength,
  );
  const signalStrength = clampUnitInterval(
    rawMergeReadiness.signalStrength ?? analysis.signalStrength,
  );

  let decisionType: DecisionType =
    rawMergeReadiness.decisionType ??
    ((rawMergeReadiness.status === "BLOCK" || finalRiskLevel === "HIGH")
      ? "HIGH_RISK"
      : "NORMAL");

  let status = rawMergeReadiness.status ?? "SAFE";
  let reason = rawMergeReadiness.reason ?? "all signals clear for merge";
  let score =
    typeof rawMergeReadiness.score === "number" && Number.isFinite(rawMergeReadiness.score)
      ? rawMergeReadiness.score
      : 0;

  if (isLowImpactPR) {
    decisionType = "LOW_IMPACT_SAFE";
    status = "SAFE";
    reason = "Low-impact PR (minimal changes detected)";
    score = Math.min(score || 12, 15);
  } else if (reason.toLowerCase().includes("low confidence in analysis")) {
    reason = finalRiskLevel === "HIGH"
      ? "High-risk change detected"
      : "review recommended before merge";
  }

  return {
    status,
    score,
    reason,
    decisionConfidence,
    signalStrength,
    decisionType,
  };
}

export default function Home() {
  const [prUrl, setPrUrl] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [repositoryData, setRepositoryData] = useState<RepositoryData | undefined>();
  const [blastRadius, setBlastRadius] = useState<BlastRadius | null>(null);
  const [compliance, setCompliance] = useState<ComplianceResult | null>(null);
  const [mergeReadiness, setMergeReadiness] = useState<MergeReadiness | null>(null);
  const hasAutoAnalyzed = useRef(false);

  const clearAnalysisState = useCallback(() => {
    setAnalysisResult(null);
    setRepositoryData(undefined);
    setBlastRadius(null);
    setCompliance(null);
    setMergeReadiness(null);
  }, []);

  const handleAnalyze = useCallback(async (overridePrUrl?: string) => {
    const trimmedPrUrl = (overridePrUrl ?? prUrl).trim();

    if (!trimmedPrUrl) {
      setError("Enter a GitHub pull request URL to generate the review dashboard.");
      clearAnalysisState();
      return;
    }

    if (!isValidGitHubPRUrl(trimmedPrUrl)) {
      setError("Invalid GitHub PR URL. Use format: https://github.com/owner/repo/pull/number");
      clearAnalysisState();
      return;
    }

    setIsAnalyzing(true);
    setError("");

    try {
      const response = await fetch("/api/analyze-pr/v2", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pr_url: trimmedPrUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to analyze PR.");
      }

      const normalizedAnalysis = normalizeAnalysis(data.analysis);
      const normalizedBlastRadius = (data.blastRadius ?? null) as BlastRadius | null;
      const normalizedMergeReadiness = normalizeMergeReadiness(
        data.mergeReadiness ?? {},
        normalizedAnalysis,
        normalizedBlastRadius,
        data.finalRiskLevel,
      );

      startTransition(() => {
        setAnalysisResult({
          analysis: normalizedAnalysis,
          finalRiskLevel: data.finalRiskLevel,
        });
        setRepositoryData(data.repository);
        setBlastRadius(normalizedBlastRadius);
        setCompliance(data.compliance);
        setMergeReadiness(normalizedMergeReadiness);
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setError(message);
      clearAnalysisState();
    } finally {
      setIsAnalyzing(false);
    }
  }, [clearAnalysisState, prUrl]);

  useEffect(() => {
    if (hasAutoAnalyzed.current) return;

    const urlParam = new URLSearchParams(window.location.search).get("url");
    if (!urlParam) return;

    const incomingPrUrl = urlParam.trim();
    setPrUrl(incomingPrUrl);

    if (!isValidGitHubPRUrl(incomingPrUrl)) {
      setError("Invalid GitHub PR URL in query parameter.");
      return;
    }

    hasAutoAnalyzed.current = true;
    void handleAnalyze(incomingPrUrl);
  }, [handleAnalyze]);

  return (
    <div className="min-h-screen px-4 py-6 text-slate-100 sm:px-6 lg:px-8 lg:py-8">
      <main className="mx-auto flex w-full max-w-[1400px] flex-col gap-8">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]"
        >
          <div className="dashboard-card rounded-[32px] p-8 sm:p-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-cyan-100/90">
              <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(103,232,249,0.85)]" />
              Premium PR Intelligence
            </div>

            <div className="mt-8 space-y-4">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                MergeMind
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                Immerse reviewers in a decision-first dashboard for pull request
                risk, blast radius, compliance, and merge confidence.
              </p>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {introCards.map((card) => {
                const Icon = card.icon;

                return (
                  <div
                    key={card.title}
                    className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5 shadow-[0_20px_40px_-32px_rgba(15,23,42,0.95)]"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-100">
                      <Icon className="size-5" />
                    </div>
                    <h2 className="mt-4 text-lg font-semibold text-white">{card.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      {card.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
            className="dashboard-card rounded-[32px] p-6 sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-slate-500">
                  Analyze
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-white">
                  Pull request dashboard
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Paste a GitHub PR URL to generate verdict, blast radius,
                  compliance, and follow-up actions.
                </p>
              </div>

              <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-3 text-cyan-100 shadow-[0_0_40px_-24px_rgba(56,189,248,0.65)]">
                <GitPullRequestArrow className="size-5" />
              </div>
            </div>

            <div className="mt-8">
              <label
                htmlFor="github-pr-url"
                className="text-sm font-medium text-slate-300"
              >
                GitHub pull request URL
              </label>
              <input
                id="github-pr-url"
                type="text"
                value={prUrl}
                onChange={(event) => setPrUrl(event.target.value)}
                placeholder="https://github.com/owner/repo/pull/123"
                className="mt-3 w-full rounded-[20px] border border-white/10 bg-slate-950/55 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400/40 focus:bg-slate-950/75 focus:shadow-[0_0_0_1px_rgba(56,189,248,0.22)]"
              />
            </div>

            <motion.button
              type="button"
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => {
                void handleAnalyze();
              }}
              disabled={isAnalyzing}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-[20px] border border-cyan-400/20 bg-cyan-400/10 px-5 py-3 text-sm font-medium text-cyan-50 shadow-[0_18px_50px_-30px_rgba(56,189,248,0.75)] transition hover:border-cyan-300/30 hover:bg-cyan-400/14 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isAnalyzing ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <ArrowRight className="size-4" />
              )}
              {isAnalyzing ? "Analyzing PR" : "Generate dashboard"}
            </motion.button>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                  Includes
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  Verdict hero, animated risk scoring, and structured findings.
                </p>
              </div>
              <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                  Visuals
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  Blast radius chart, compliance indicators, and impact cards.
                </p>
              </div>
            </div>

            {isAnalyzing && (
              <p className="mt-4 flex items-center gap-2 text-sm text-cyan-200">
                <LoaderCircle className="size-4 animate-spin" />
                Building the review surface...
              </p>
            )}

            {error ? (
              <div className="mt-4 rounded-[20px] border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-100">
                {error}
              </div>
            ) : null}
          </motion.section>
        </motion.section>

        {analysisResult && mergeReadiness ? (
          <PRAnalysisCard
            analysis={analysisResult.analysis}
            finalRiskLevel={analysisResult.finalRiskLevel}
            isLoading={isAnalyzing}
            repositoryData={repositoryData}
            blastRadius={blastRadius}
            compliance={compliance}
            mergeReadiness={mergeReadiness}
          />
        ) : (
          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr_0.9fr]"
          >
            <div className="dashboard-card rounded-[28px] p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-emerald-200">
                  <ShieldCheck className="size-5" />
                </div>
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-slate-500">
                    Verdict card
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-white">
                    Decision-focused hero
                  </h2>
                </div>
              </div>
              <div className="mt-6 space-y-3">
                <div className="h-3 rounded-full bg-white/[0.06]" />
                <div className="h-3 w-5/6 rounded-full bg-white/[0.06]" />
                <div className="h-24 rounded-[22px] border border-white/10 bg-white/[0.03]" />
              </div>
            </div>

            <div className="dashboard-card rounded-[28px] p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-3 text-cyan-100">
                  <ChartNetwork className="size-5" />
                </div>
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-slate-500">
                    Blast radius
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-white">
                    Impact visualization
                  </h2>
                </div>
              </div>
              <div className="mt-6 grid h-[220px] place-items-center rounded-[24px] border border-white/10 bg-slate-950/40">
                <div className="h-32 w-32 rounded-full border border-cyan-400/20 bg-cyan-400/10 shadow-[0_0_70px_-32px_rgba(34,211,238,0.6)]" />
              </div>
            </div>

            <div className="dashboard-card rounded-[28px] p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-slate-200">
                  <GitPullRequestArrow className="size-5" />
                </div>
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-slate-500">
                    Awaiting analysis
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-white">
                    Results appear here
                  </h2>
                </div>
              </div>
              <p className="mt-6 text-sm leading-6 text-slate-400">
                Run an analysis to populate the dashboard with animated cards,
                blast radius layers, compliance signals, and repository impact.
              </p>
            </div>
          </motion.section>
        )}
      </main>
    </div>
  );
}
