"use client";

import { useState } from "react";

type PRAnalysis = {
  pr_title: string;
  commit_message: string;
  description: string;
  risk_level: "Low" | "Medium" | "High";
  blast_radius: string[];
  test_cases: string[];
};

const MAX_DIFF_CHARS = 200_000;

export default function Home() {
  const [diffInput, setDiffInput] = useState("");
  const [analysisOutput, setAnalysisOutput] = useState<PRAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState("");

  const handleAnalyze = async () => {
    const trimmedInput = diffInput.trim();

    if (!trimmedInput) {
      setError("Please paste a git diff before analyzing.");
      setAnalysisOutput(null);
      return;
    }

    if (trimmedInput.length > MAX_DIFF_CHARS) {
      setError(`Diff is too large. Keep it under ${MAX_DIFF_CHARS.toLocaleString()} characters.`);
      setAnalysisOutput(null);
      return;
    }

    setIsAnalyzing(true);
    setError("");

    try {
      const response = await fetch("/api/analyze-pr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ diff: trimmedInput }),
      });

      const data = await response.json();
      console.log(data)
      if (!response.ok) {
        throw new Error(data.error || "Failed to analyze PR.");
      }
  
      setAnalysisOutput(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setError(message);
      setAnalysisOutput(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-10 text-gray-900">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">PRPilot AI</h1>
          <p className="text-gray-600">
            Analyze pull requests instantly from your git diff
          </p>
        </header>

        {/* Input Section */}

        <section className="rounded-xl bg-white p-6 shadow-sm">
          <label htmlFor="git-diff" className="mb-3 block text-sm font-medium">
            Paste Git Diff
          </label>

          <textarea
            id="git-diff"
            value={diffInput}
            onChange={(event) => setDiffInput(event.target.value)}
            placeholder="Paste your git diff here..."
            className="min-h-64 w-full rounded-lg border border-gray-200 bg-gray-50 p-4 font-mono text-sm text-gray-900 outline-none transition focus:border-gray-400"
          />

          <button
            type="button"
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="mt-4 inline-flex items-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isAnalyzing ? "Analyzing..." : "Analyze PR"}
          </button>

          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        </section>

        <section className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">PR Analysis</h2>

          {!analysisOutput && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
              Structured PR analysis will appear here...
            </div>
          )}

          {analysisOutput && (
            <div className="space-y-6">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <h3 className="mb-2 font-semibold">PR Title</h3>
                <p>{analysisOutput.pr_title || "N/A"}</p>
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <h3 className="mb-2 font-semibold">Commit Message</h3>
                <p>{analysisOutput.commit_message || "N/A"}</p>
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <h3 className="mb-2 font-semibold">PR Description</h3>
                <p className="whitespace-pre-wrap">{analysisOutput.description || "N/A"}</p>
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <h3 className="mb-2 font-semibold">Risk Level</h3>
                <p>{analysisOutput.risk_level}</p>
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <h3 className="mb-2 font-semibold">Blast Radius</h3>
                {analysisOutput.blast_radius.length === 0 ? (
                  <p>N/A</p>
                ) : (
                  <ul className="list-disc pl-5">
                    {analysisOutput.blast_radius.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <h3 className="mb-2 font-semibold">Suggested Test Cases</h3>
                {analysisOutput.test_cases.length === 0 ? (
                  <p>N/A</p>
                ) : (
                  <ul className="list-disc pl-5">
                    {analysisOutput.test_cases.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
