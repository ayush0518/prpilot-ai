import { analyzePullRequest } from "@/app/services/prAnalyzer";

export type AnalyzePRResult = Awaited<ReturnType<typeof analyzePullRequest>>;

const GITHUB_PR_URL_PATTERN = /^https:\/\/github\.com\/[^\/]+\/[^\/]+\/pull\/\d+(?:\/.*)?$/i;

function requireEnv(name: "GITHUB_TOKEN" | "OPENAI_API_KEY"): void {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
}

export async function analyzePR(prUrl: string): Promise<AnalyzePRResult> {
  if (typeof prUrl !== "string" || prUrl.trim().length === 0) {
    throw new Error("prUrl must be a non-empty string");
  }

  const normalizedPRUrl = prUrl.trim();
  if (!GITHUB_PR_URL_PATTERN.test(normalizedPRUrl)) {
    throw new Error("Invalid GitHub PR URL format. Use: https://github.com/owner/repo/pull/number");
  }

  console.log("[analyzePR] Starting PR analysis", {
    prUrl: normalizedPRUrl,
    hasGithubToken: Boolean(process.env.GITHUB_TOKEN),
    hasOpenAIKey: Boolean(process.env.OPENAI_API_KEY),
  });

  requireEnv("GITHUB_TOKEN");
  requireEnv("OPENAI_API_KEY");

  return analyzePullRequest(normalizedPRUrl);
}

