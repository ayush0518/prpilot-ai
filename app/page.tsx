"use client";

import { useState } from "react";

type PRSummary = {
  summary: string;
  keyChanges: string[];
  testingSteps: string[];
  changelog: string;
};

export default function Home() {
  const [diffInput, setDiffInput] = useState("");
  const [generatedOutput, setGeneratedOutput] = useState<PRSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    if (!diffInput.trim()) {
      setError("Please paste a git diff before generating.");
      setGeneratedOutput(null);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ diff: diffInput }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate PR summary.");
      }

      setGeneratedOutput(data);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.";
      setError(message);
      setGeneratedOutput(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedOutput) return;

    const formatted = `
Summary
-------
${generatedOutput.summary}

Key Changes
-----------
${generatedOutput.keyChanges.map((c) => `- ${c}`).join("\n")}

Testing Steps
-------------
${generatedOutput.testingSteps.map((t, i) => `${i + 1}. ${t}`).join("\n")}

Changelog
---------
${generatedOutput.changelog}
`;

    await navigator.clipboard.writeText(formatted);
  };

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-10 text-gray-900">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">PRPilot AI</h1>
          <p className="text-gray-600">
            Generate GitHub PR descriptions instantly from your git diff
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
            onClick={handleGenerate}
            disabled={isLoading}
            className="mt-4 inline-flex items-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "Generating..." : "Generate PR Summary"}
          </button>

          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        </section>

        {/* Output Section */}

        <section className="rounded-xl bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">AI Output</h2>

            <button
              type="button"
              onClick={handleCopy}
              disabled={!generatedOutput}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Copy
            </button>
          </div>

          {!generatedOutput && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
              Generated PR summary will appear here...
            </div>
          )}

          {generatedOutput && (
            <div className="space-y-6">

              {/* Summary */}

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <h3 className="mb-2 font-semibold">Summary</h3>
                <p>{generatedOutput.summary}</p>
              </div>

              {/* Key Changes */}

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <h3 className="mb-2 font-semibold">Key Changes</h3>
                <ul className="list-disc pl-5">
                  {generatedOutput.keyChanges.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>

              {/* Testing Steps */}

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <h3 className="mb-2 font-semibold">Testing Steps</h3>
                <ol className="list-decimal pl-5">
                  {generatedOutput.testingSteps.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ol>
              </div>

              {/* Changelog */}

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <h3 className="mb-2 font-semibold">Changelog</h3>
                <pre className="font-mono text-sm whitespace-pre-wrap">
                  {generatedOutput.changelog}
                </pre>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}