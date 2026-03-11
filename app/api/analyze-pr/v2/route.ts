import { analyzePullRequest } from "@/app/services/prAnalyzer";

interface AnalyzePRRequest {
  prNumber?: number;
  owner?: string;
  repo?: string;
  url?: string;
  prUrl?: string;
  pr_url?: string;
}

interface AnalyzePRResponse {
  analysis: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
}

/**
 * Enhanced PR Analysis Endpoint
 * Supports multiple input formats:
 * 1. { prNumber: 123 } - requires GITHUB_REPO env var (owner/repo format)
 * 2. { owner: "user", repo: "repo", prNumber: 123 }
 * 3. { url: "https://github.com/owner/repo/pull/123" }
 */
export async function POST(req: Request): Promise<Response> {
  try {
    const body = (await req.json()) as AnalyzePRRequest;

    console.log("DEBUG: Incoming request body:", JSON.stringify(body));

    let prIdentifier: string;

    // Format 1: prNumber only (requires GITHUB_REPO env var)
    if (body.prNumber && !body.owner && !body.repo && !body.url && !body.prUrl && !body.pr_url) {
      const gitHubRepo = process.env.GITHUB_REPO;
      if (!gitHubRepo) {
        return Response.json(
          {
            error: "GITHUB_REPO environment variable must be set or provide owner/repo",
          },
          { status: 400 }
        );
      }
      prIdentifier = `${gitHubRepo}#${body.prNumber}`;
    }
    // Format 2: owner, repo, and prNumber
    else if (body.owner && body.repo && body.prNumber) {
      prIdentifier = `${body.owner}/${body.repo}#${body.prNumber}`;
    }
    // Format 3: Full URL (supports url, prUrl, and pr_url fields)
    else if (body.url || body.prUrl || body.pr_url) {
      prIdentifier = body.url || body.prUrl || body.pr_url;
    } else {
      return Response.json(
        {
          error: "Invalid request. Provide either: (1) prNumber only (with GITHUB_REPO env), (2) owner/repo/prNumber, or (3) full URL",
        },
        { status: 400 }
      );
    }

    // Validate required environment variables
    if (!process.env.GITHUB_TOKEN) {
      return Response.json({ error: "GITHUB_TOKEN environment variable is not set" }, { status: 500 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return Response.json({ error: "OPENAI_API_KEY environment variable is not set" }, { status: 500 });
    }

    // Perform analysis
    const result = await analyzePullRequest(prIdentifier);

    const response: AnalyzePRResponse = {
      analysis: result.analysis,
      riskLevel: result.riskLevel,
    };

    return Response.json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

    console.error("PR Analysis Error:", errorMessage);

    // Return appropriate error response
    if (errorMessage.includes("404") || errorMessage.includes("not found")) {
      return Response.json({ error: "Pull request not found" }, { status: 404 });
    }

    if (errorMessage.includes("401") || errorMessage.includes("Unauthorized")) {
      return Response.json(
        { error: "Authentication failed. Check GITHUB_TOKEN and OPENAI_API_KEY." },
        { status: 401 }
      );
    }

    if (errorMessage.includes("token")) {
      return Response.json({ error: "Invalid or expired authentication token" }, { status: 401 });
    }

    if (errorMessage.includes("rate limit")) {
      return Response.json({ error: "Rate limit exceeded. Please try again later." }, { status: 429 });
    }

    return Response.json(
      { error: `PR analysis failed: ${errorMessage}` },
      { status: 500 }
    );
  }
}
