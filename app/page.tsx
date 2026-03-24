"use client";

import { useState } from "react";
import PRAnalysisCard from "./components/PRAnalysisCard";
import { PRAnalysisWithRiskScore, BlastRadius, ComplianceResult, MergeReadiness } from "@/app/types/prAnalysis";

type AnalysisResult = {
  analysis: PRAnalysisWithRiskScore;
  finalRiskLevel: "LOW" | "MEDIUM" | "HIGH";
};

type RepositoryData = {
  changedFiles: string[]
  totalFiles: number
}
const MAX_DIFF_CHARS = 200_000;

function isValidGitHubPRUrl(url: string): boolean {
  const regex = /^https?:\/\/github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)\/?$/;
  return regex.test(url);
}

export default function Home() {
  const [prUrl, setPrUrl] = useState("");
  const [diffInput, setDiffInput] = useState("");
  //const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [repositoryData, setRepositoryData] = useState<RepositoryData | undefined>()
  const [blastRadius, setBlastRadius] = useState<BlastRadius | null>(null)
  const [compliance, setCompliance] = useState<ComplianceResult | null>(null)
  const [mergeReadiness, setMergeReadiness] = useState<MergeReadiness | null>(null)
  const [expandedLayer, setExpandedLayer] = useState<string | null>(null)

  const handleAnalyze = async () => {
    const trimmedPrUrl = prUrl.trim();
    const trimmedDiff = diffInput.trim();

    // Validate that at least one input is provided
    if (!trimmedPrUrl && !trimmedDiff) {
      setError("Please provide either a GitHub PR URL or paste a git diff.");
      setAnalysisResult(null);
      return;
    }

    // Validate PR URL if provided
    if (trimmedPrUrl && !isValidGitHubPRUrl(trimmedPrUrl)) {
      setError("Invalid GitHub PR URL. Use format: https://github.com/owner/repo/pull/number");
      setAnalysisResult(null);
      return;
    }

    // Validate diff size if provided
    if (trimmedDiff && trimmedDiff.length > MAX_DIFF_CHARS) {
      setError(`Diff is too large. Keep it under ${MAX_DIFF_CHARS.toLocaleString()} characters.`);
      setAnalysisResult(null);
      return;
    }

    setIsAnalyzing(true);
    setError("");

    try {
      const requestBody = trimmedPrUrl ? { pr_url: trimmedPrUrl } : { diff: trimmedDiff };

      const response = await fetch("/api/analyze-pr/v2", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to analyze PR.");
      }

      setAnalysisResult({
        analysis: data.analysis,
        finalRiskLevel: data.finalRiskLevel,
      });
      setRepositoryData(data.repository);
      setBlastRadius(data.blastRadius);
      setCompliance(data.compliance);
      setMergeReadiness(data.mergeReadiness);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setError(message);
      setAnalysisResult(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-10 text-gray-100">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <header className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">MergeMind</h1>
          <p className="text-gray-400">
            Analyze pull requests instantly from your GitHub PR link
          </p>
        </header>

        {/* Input Section */}

        <section className="rounded-xl bg-gray-900 p-6 shadow-lg border border-gray-800">
          <div className="mb-6">
            <label htmlFor="github-pr-url" className="mb-3 block text-sm font-medium text-cyan-400">
              GitHub PR URL
            </label>
            <input
              id="github-pr-url"
              type="text"
              value={prUrl}
              onChange={(event) => setPrUrl(event.target.value)}
              placeholder="https://github.com/owner/repo/pull/123"
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm text-gray-100 placeholder-gray-500 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          {/* <div className="mb-4 text-center text-xs font-medium text-gray-500 uppercase">
            Or
          </div>

          <label htmlFor="git-diff" className="mb-3 block text-sm font-medium">
            Paste Git Diff
          </label>

          <textarea
            id="git-diff"
            value={diffInput}
            onChange={(event) => setDiffInput(event.target.value)}
            placeholder="Paste your git diff here..."
            className="min-h-64 w-full rounded-lg border border-gray-200 bg-gray-50 p-4 font-mono text-sm text-gray-900 outline-none transition focus:border-gray-400"
          /> */}

          <button
            type="button"
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="mt-4 inline-flex items-center rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 px-6 py-2 text-sm font-medium text-white transition hover:from-cyan-700 hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-60 shadow-lg"
          >
            {isAnalyzing ? "Analyzing..." : "Analyze PR"}
          </button>

          {isAnalyzing && (
            <p className="mt-3 flex items-center gap-2 text-sm text-cyan-400">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent"></span>
              Analyzing PR with MergeMind...
            </p>
          )}

          {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
        </section>

        {/* Merge Decision Section */}
        {analysisResult && mergeReadiness && (
          <section className={`rounded-xl p-6 shadow-lg border-2 ${
            mergeReadiness.status === "SAFE"
              ? "bg-green-950 border-green-700"
              : mergeReadiness.status === "CAUTION"
              ? "bg-yellow-950 border-yellow-700"
              : "bg-red-950 border-red-700"
          }`}>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-4xl">
                  {mergeReadiness.status === "SAFE"
                    ? "✅"
                    : mergeReadiness.status === "CAUTION"
                    ? "⚠️"
                    : "🛑"}
                </span>
                <div>
                  <h2 className={`text-2xl font-bold ${
                    mergeReadiness.status === "SAFE"
                      ? "text-green-400"
                      : mergeReadiness.status === "CAUTION"
                      ? "text-yellow-400"
                      : "text-red-400"
                  }`}>
                    {mergeReadiness.status === "SAFE"
                      ? "READY TO MERGE"
                      : mergeReadiness.status === "CAUTION"
                      ? "MERGE WITH CAUTION"
                      : "MERGE BLOCKED"}
                  </h2>
                  <p className="text-sm text-gray-400 mt-1">
                    Merge Decision Based on All Signals
                  </p>
                </div>
              </div>

              <div className={`rounded-lg p-4 ${
                mergeReadiness.status === "SAFE"
                  ? "bg-green-900/30"
                  : mergeReadiness.status === "CAUTION"
                  ? "bg-yellow-900/30"
                  : "bg-red-900/30"
              }`}>
                <p className="text-gray-100 whitespace-normal break-words">
                  <span className="font-semibold">Reason:</span> {mergeReadiness.reason}
                </p>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Total Risk Score</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-gray-700 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full ${
                        mergeReadiness.score < 40
                          ? "bg-green-500"
                          : mergeReadiness.score < 70
                          ? "bg-yellow-500"
                          : "bg-red-500"
                      }`}
                      style={{ width: `${mergeReadiness.score}%` }}
                    />
                  </div>
                  <span className={`font-bold text-lg ${
                    mergeReadiness.score < 40
                      ? "text-green-400"
                      : mergeReadiness.score < 70
                      ? "text-yellow-400"
                      : "text-red-400"
                  }`}>
                    {mergeReadiness.score}/100
                  </span>
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="rounded-xl bg-gray-900 p-6 shadow-lg border border-gray-800">
          <h2 className="mb-4 text-xl font-semibold text-cyan-400">PR Analysis</h2>

          {!analysisResult && (
            <div className="rounded-lg border border-gray-700 bg-gray-800 p-4 text-sm text-gray-400">
              Structured PR analysis will appear here...
            </div>
          )}

          {analysisResult && (
            <PRAnalysisCard
              analysis={analysisResult.analysis}
              finalRiskLevel={analysisResult.finalRiskLevel}
              isLoading={isAnalyzing}
              repositoryData={repositoryData}
              blastRadius={blastRadius}
              compliance={compliance}
              expandedLayer={expandedLayer}
              setExpandedLayer={setExpandedLayer}
            />
          )}
        </section>
      </main>
    </div>
  );
}
