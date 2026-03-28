import OpenAI from "openai";

type PRAnalysisResponse = {
  pr_title: string;
  commit_message: string;
  description: string;
  risk_level: "Low" | "Medium" | "High";
  blast_radius: string[];
  test_cases: string[];
};

/**
 * ⚡ CRITICAL: Force dynamic evaluation for this route
 * Without this, Next.js attempts static optimization at build time,
 * but OPENAI_API_KEY is undefined during build → module load fails
 */
export const dynamic = "force-dynamic";

const MAX_DIFF_CHARS = 200_000;
const MAX_DIFF_LINES = 1_500;

function normalizeRiskLevel(value: unknown): "Low" | "Medium" | "High" {
  if (typeof value !== "string") {
    return "Medium";
  }

  const normalized = value.trim().toLowerCase();

  if (normalized === "low") return "Low";
  if (normalized === "high") return "High";
  return "Medium";
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function normalizeAnalysis(value: unknown): PRAnalysisResponse {
  const data = (value ?? {}) as Record<string, unknown>;

  return {
    pr_title: typeof data.pr_title === "string" ? data.pr_title : "",
    commit_message: typeof data.commit_message === "string" ? data.commit_message : "",
    description: typeof data.description === "string" ? data.description : "",
    risk_level: normalizeRiskLevel(data.risk_level),
    blast_radius: normalizeStringArray(data.blast_radius),
    test_cases: normalizeStringArray(data.test_cases),
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const diff = body?.diff;
    const pr_url = body?.pr_url;

    let finalDiff: string;

    // Handle GitHub PR URL
    if (pr_url) {
      if (typeof pr_url !== "string") {
        return Response.json({ error: "pr_url must be a string" }, { status: 400 });
      }

      const urlMatch = pr_url.match(/github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)/);
      if (!urlMatch) {
        return Response.json(
          {
            error: "Invalid GitHub PR URL format. Use: https://github.com/owner/repo/pull/number",
          },
          { status: 400 }
        );
      }

      const [, owner, repo, pullNumber] = urlMatch;
      const diffUrl = `https://patch-diff.githubusercontent.com/raw/${owner}/${repo}/pull/${pullNumber}.diff`;

      try {
        const diffResponse = await fetch(diffUrl);
        if (!diffResponse.ok) {
          return Response.json(
            { error: `Failed to fetch PR diff from GitHub (status: ${diffResponse.status})` },
            { status: 400 }
          );
        }
        finalDiff = await diffResponse.text();
      } catch {
        return Response.json(
          { error: "Failed to fetch PR from GitHub. Please check the URL and try again." },
          { status: 400 }
        );
      }
    } else if (diff) {
      // Handle manual diff input
      if (typeof diff !== "string" || !diff.trim()) {
        return Response.json({ error: "Git diff is required" }, { status: 400 });
      }
      finalDiff = diff;
    } else {
      return Response.json(
        { error: "Either 'diff' or 'pr_url' is required" },
        { status: 400 }
      );
    }

    if (finalDiff.length > MAX_DIFF_CHARS) {
      return Response.json(
        { error: `Diff is too large. Keep it under ${MAX_DIFF_CHARS.toLocaleString()} characters.` },
        { status: 413 }
      );
    }

    const trimmedDiff = finalDiff.split("\n").slice(0, MAX_DIFF_LINES).join("\n");

    const prompt = `
You are a senior software engineer reviewing a pull request.

Analyze the following git diff and return structured JSON.

{
  "pr_title": "",
  "commit_message": "",
  "description": "",
  "risk_level": "Low | Medium | High",
  "blast_radius": [],
  "test_cases": []
}

Return JSON only. Do not include markdown fences.

Git Diff:
${trimmedDiff}
`;

    // ⚡ Initialize OpenAI client inside handler (runtime-only)
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You are a senior software architect." },
        { role: "user", content: prompt },
      ],
    });

    const content = completion.choices[0]?.message.content;

    if (!content || typeof content !== "string") {
      return Response.json({ error: "Empty response from OpenAI" }, { status: 500 });
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(content);
    } catch {
      return Response.json({ error: "Invalid JSON response from OpenAI" }, { status: 500 });
    }

    return Response.json(normalizeAnalysis(parsed));
  } catch (error) {
    console.error(error);
    return Response.json({ error: "PR analysis failed" }, { status: 500 });
  }
}
