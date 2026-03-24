import { analyzePR } from "@/app/services/analyzePR";
import { PRAnalysisWithRiskScore, BlastRadius, ComplianceResult, MergeReadiness } from "@/app/types/prAnalysis";

/**
 * ⚡ CRITICAL: Force dynamic evaluation for this route
 * Required because this API route:
 * - Accesses environment variables (GITHUB_TOKEN, OPENAI_API_KEY)
 * - Makes external API calls to GitHub and OpenAI
 * - Processes user-provided PR identifiers at request time
 * 
 * Without this, Next.js tries static optimization → fails at build time
 * because env vars don't exist during build
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface AnalyzePRRequest {
  prNumber?: number;
  owner?: string;
  repo?: string;
  url?: string;
  prUrl?: string;
  pr_url?: string;
}

interface AnalyzePRResponse {
  success: boolean;
  analysis?: PRAnalysisWithRiskScore;
  finalRiskLevel?: "LOW" | "MEDIUM" | "HIGH";
  repository?: {
    changedFiles: string[];
    totalFiles: number;
  };
  blastRadius?: BlastRadius;
  compliance?: ComplianceResult;
  mergeReadiness?: MergeReadiness;
  error?: string;
  errorCode?: string;
}

/**
 * Enhanced PR Analysis Endpoint (v2)
 * Returns structured JSON analysis with risk scoring
 * 
 * Supports multiple input formats:
 * 1. { prNumber: 123 } - requires GITHUB_REPO env var (owner/repo format)
 * 2. { owner: "user", repo: "repo", prNumber: 123 }
 * 3. { url: "https://github.com/owner/repo/pull/123" }
 */
export async function POST(req: Request): Promise<Response> {
  try {
    const body = (await req.json()) as AnalyzePRRequest;

    console.log("DEBUG: Incoming v2 request body:", JSON.stringify(body));

    let prUrl: string;
    const hasPrNumber = typeof body.prNumber === "number" && Number.isFinite(body.prNumber);

    // Format 1: prNumber only (requires GITHUB_REPO env var)
    if (hasPrNumber && !body.owner && !body.repo && !body.url && !body.prUrl && !body.pr_url) {
      const gitHubRepo = process.env.GITHUB_REPO;
      if (!gitHubRepo) {
        return Response.json(
          {
            success: false,
            error: "GITHUB_REPO environment variable must be set or provide owner/repo",
            errorCode: "MISSING_ENV",
          } as AnalyzePRResponse,
            { status: 400 }
          );
      }
      prUrl = `https://github.com/${gitHubRepo}/pull/${body.prNumber}`;
    }
    // Format 2: owner, repo, and prNumber
    else if (body.owner && body.repo && hasPrNumber) {
      prUrl = `https://github.com/${body.owner}/${body.repo}/pull/${body.prNumber}`;
    }
    // Format 3: Full URL (supports url, prUrl, and pr_url fields)
    else if (body.url || body.prUrl || body.pr_url) {
      prUrl = (body.url || body.prUrl || body.pr_url) as string;
    } else {
      return Response.json(
        {
          success: false,
          error: "Invalid request. Provide either: (1) prNumber only (with GITHUB_REPO env), (2) owner/repo/prNumber, or (3) full URL",
          errorCode: "INVALID_REQUEST",
        } as AnalyzePRResponse,
        { status: 400 }
      );
    }

    console.log("DEBUG: Resolved PR URL for v2 analysis", {
      prUrl,
      hasGithubToken: Boolean(process.env.GITHUB_TOKEN),
      hasOpenAIKey: Boolean(process.env.OPENAI_API_KEY),
      hasGithubRepo: Boolean(process.env.GITHUB_REPO),
    });

    // Perform analysis
    const result = await analyzePR(prUrl);

    const response: AnalyzePRResponse = {
      success: true,
      analysis: result.analysis,
      finalRiskLevel: result.finalRiskLevel,
      repository: result.repository,
      blastRadius: result.blastRadius,
      compliance: result.compliance,
      mergeReadiness: result.mergeReadiness,
    };

    return Response.json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

    console.error("PR Analysis Error:", errorMessage);

    // Determine error code and status
    let status = 500;
    let errorCode = "ANALYSIS_FAILED";

    if (errorMessage.includes("404") || errorMessage.includes("not found")) {
      status = 404;
      errorCode = "NOT_FOUND";
    } else if (errorMessage.includes("401") || errorMessage.includes("Unauthorized")) {
      status = 401;
      errorCode = "UNAUTHORIZED";
    } else if (errorMessage.includes("Missing required environment variable")) {
      status = 500;
      errorCode = "MISSING_ENV";
    } else if (errorMessage.includes("token")) {
      status = 401;
      errorCode = "TOKEN_ERROR";
    } else if (errorMessage.includes("rate limit")) {
      status = 429;
      errorCode = "RATE_LIMITED";
    } else if (errorMessage.includes("parse") || errorMessage.includes("JSON")) {
      status = 500;
      errorCode = "PARSE_ERROR";
    }

    return Response.json(
      {
        success: false,
        error: `PR analysis failed: ${errorMessage}`,
        errorCode,
      } as AnalyzePRResponse,
      { status }
    );
  }
}
