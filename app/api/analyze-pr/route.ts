import OpenAI from "openai";

type PRAnalysisResponse = {
  pr_title: string;
  commit_message: string;
  description: string;
  risk_level: "Low" | "Medium" | "High";
  blast_radius: string[];
  test_cases: string[];
};

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

    if (typeof diff !== "string" || !diff.trim()) {
      return Response.json({ error: "Git diff is required" }, { status: 400 });
    }

    if (diff.length > MAX_DIFF_CHARS) {
      return Response.json(
        { error: `Diff is too large. Keep it under ${MAX_DIFF_CHARS.toLocaleString()} characters.` },
        { status: 413 }
      );
    }

    const trimmedDiff = diff.split("\n").slice(0, MAX_DIFF_LINES).join("\n");

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
