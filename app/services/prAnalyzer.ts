import OpenAI from "openai";
import { buildPRContext, PRContext } from "@/app/services/contextBuilder";
import { createPRPrompt } from "@/app/prompts/prAnalysisPrompt";
import { parseLLMResponse } from "@/app/utils/parseLLMResponse";
import { enhanceAnalysisWithRiskScore, determineFinalRiskLevel } from "@/app/core/riskEngine";
import { computeBlastRadius } from "@/app/core/blastRadiusEngine";
import { analyzeCompliance } from "@/app/core/complianceEngine";
import { computeMergeReadiness } from "@/app/core/mergeReadinessEngine";
import { PRAnalysisWithRiskScore, BlastRadius, ComplianceResult, MergeReadiness } from "@/app/types/prAnalysis";

interface GitHubPRData {
  title: string;
  body: string;
  files: Array<{
    filename: string;
    additions: number;
    deletions: number;
    patch?: string;
  }>;
}

interface AnalysisOutput {
  analysis: PRAnalysisWithRiskScore;
  finalRiskLevel: "LOW" | "MEDIUM" | "HIGH"; // 🔥 SINGLE SOURCE OF TRUTH - UI must use only this value, not analysis.riskLevel or analysis.computedRiskLevel
  repository?: {
    changedFiles: string[];
    totalFiles: number;
  };
  blastRadius?: BlastRadius;
  compliance?: ComplianceResult;
  mergeReadiness?: MergeReadiness; // 🔥 Single merge decision for the PR
}

/**
 * Parses GitHub PR URL to extract owner, repo, and PR number
 */
function parseGitHubPRUrl(url: string): { owner: string; repo: string; prNumber: string } | null {
  const match = url.match(/^https:\/\/github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)/);
  if (!match) {
    return null;
  }
  return {
    owner: match[1],
    repo: match[2],
    prNumber: match[3],
  };
}

/**
 * Fetches PR details from GitHub API
 */
async function fetchPRDetails(owner: string, repo: string, prNumber: string): Promise<GitHubPRData> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("GITHUB_TOKEN environment variable is not set");
  }

  const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github.v3+json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch PR: ${response.statusText}`);
  }

  const data = await response.json();

  return {
    title: data.title,
    body: data.body || "",
    files: [], // Will be fetched separately
  };
}

/**
 * Fetches changed files from PR
 */
async function fetchPRFiles(
  owner: string,
  repo: string,
  prNumber: string
): Promise<
  Array<{
    filename: string;
    additions: number;
    deletions: number;
    patch?: string;
  }>
> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("GITHUB_TOKEN environment variable is not set");
  }

  const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/files`;

  const response = await fetch(url, {
    headers: {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github.v3+json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch PR files: ${response.statusText}`);
  }

  const files = await response.json();

  return files.map((file: Record<string, unknown>) => ({
    filename: String(file.filename || ""),
    additions: Number(file.additions || 0),
    deletions: Number(file.deletions || 0),
    patch: String(file.patch || ""),
  }));
}

/**
 * Sends PR context to OpenAI for analysis
 * Uses strict JSON output and parses response safely
 */
async function analyzeWithOpenAI(context: PRContext): Promise<PRAnalysisWithRiskScore> {
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const prompt = createPRPrompt(context);

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3, // Lower temperature for more consistent JSON
    });

    // Extract text from response
    const textContent = response.choices[0]?.message.content;
    if (!textContent) {
      throw new Error("No text content in OpenAI response");
    }

    // Parse the response using our safe parser
    const parseResult = parseLLMResponse(textContent);
    if (!parseResult.success || !parseResult.analysis) {
      throw new Error(`Failed to parse LLM response: ${parseResult.error}`);
    }

    // Enhance analysis with computed risk score
    const enhancedAnalysis = enhanceAnalysisWithRiskScore(parseResult.analysis, context);

    return enhancedAnalysis;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`OpenAI analysis failed: ${errorMessage}`);
  }
}

/**
 * Main PR Analyzer - orchestrates the entire analysis flow
 */
export async function analyzePullRequest(
  prIdentifier: string // Can be PR URL or "owner/repo#prNumber" format
): Promise<AnalysisOutput> {
  let owner: string;
  let repo: string;
  let prNumber: string;

  // Parse input to extract owner, repo, and PR number
  if (prIdentifier.includes("github.com")) {
    const parsed = parseGitHubPRUrl(prIdentifier);
    if (!parsed) {
      throw new Error("Invalid GitHub PR URL format");
    }
    owner = parsed.owner;
    repo = parsed.repo;
    prNumber = parsed.prNumber;
  } else if (prIdentifier.includes("/") && prIdentifier.includes("#")) {
    const parts = prIdentifier.split("#");
    const repoParts = parts[0].split("/");
    if (repoParts.length !== 2) {
      throw new Error("Invalid PR identifier format. Use: owner/repo#prNumber");
    }
    owner = repoParts[0];
    repo = repoParts[1];
    prNumber = parts[1];
  } else {
    throw new Error("Invalid PR identifier. Provide GitHub URL or owner/repo#prNumber");
  }

  try {
    // Fetch PR details
    const prDetails = await fetchPRDetails(owner, repo, prNumber);

    // Fetch changed files
    const files = await fetchPRFiles(owner, repo, prNumber);

    // Build PR context
    const context = buildPRContext(prDetails.title, prDetails.body, files);

    // Generate analysis with OpenAI
    const analysis = await analyzeWithOpenAI(context);

    // Determine final risk level (uses computed score validation)
    const finalRiskLevel = determineFinalRiskLevel(analysis);

    // Compute blast radius
    const blastRadius = computeBlastRadius(context.files.map(file => file.filename));

    // Analyze compliance
    const compliance = analyzeCompliance(context.files.map(file => file.filename));

    // Compute merge readiness (all signals combined)
    const mergeReadiness = computeMergeReadiness({
      finalRiskLevel,
      complianceRisk: compliance.riskLevel,
      impactScore: blastRadius.impactScore,
      confidenceScore: analysis.confidenceScore
    });

    return {
      analysis,
      finalRiskLevel,
      repository: {
        changedFiles: context.files.map(file => file.filename),
        totalFiles: context.files.length
      },
      blastRadius,
      compliance,
      mergeReadiness
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to analyze PR: ${errorMessage}`);
  }
}

/**
 * Analyzes PR from raw GitHub data (for testing purposes)
 */
export async function analyzePRFromData(prData: GitHubPRData): Promise<AnalysisOutput> {
  try {
    // Build PR context directly
    const context = buildPRContext(prData.title, prData.body, prData.files);

    // Generate analysis with OpenAI
    const analysis = await analyzeWithOpenAI(context);

    // Determine final risk level
    const finalRiskLevel = determineFinalRiskLevel(analysis);

    // Compute blast radius
    const blastRadius = computeBlastRadius(prData.files.map(file => file.filename));

    // Analyze compliance
    const compliance = analyzeCompliance(prData.files.map(file => file.filename));

    // Compute merge readiness (all signals combined)
    const mergeReadiness = computeMergeReadiness({
      finalRiskLevel,
      complianceRisk: compliance.riskLevel,
      impactScore: blastRadius.impactScore,
      confidenceScore: analysis.confidenceScore
    });

    return {
      analysis,
      finalRiskLevel,
      repository: {
        changedFiles: prData.files.map(file => file.filename),
        totalFiles: prData.files.length
      },
      blastRadius,
      compliance,
      mergeReadiness
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to analyze PR: ${errorMessage}`);
  }
}
