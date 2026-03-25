import { NextRequest, NextResponse } from "next/server";
import { App } from "octokit";
import { analyzePR } from "@/app/services/analyzePR";
import { generatePRComment } from "@/app/utils/prCommentFormatter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const payload = JSON.parse(rawBody);

    const event = req.headers.get("x-github-event");

    if (event !== "pull_request") {
      return NextResponse.json({ ignored: true });
    }

    const action = payload.action;

    // Only handle PR opened or updated
    if (!["opened", "synchronize"].includes(action)) {
      return NextResponse.json({ ignored: true });
    }

    const pr = payload.pull_request;

    const prUrl = pr?.html_url;
    const prNumber = pr?.number;
    const repo = payload.repository?.name;
    const owner = payload.repository?.owner?.login;
    const installationId = payload.installation?.id;

    if (!prUrl || !prNumber || !repo || !owner || !installationId) {
      console.error("Missing required fields", {
        prUrl,
        prNumber,
        repo,
        owner,
        installationId,
      });
      return NextResponse.json(
        { error: "Invalid payload" },
        { status: 400 }
      );
    }

    console.log("Processing PR:", prUrl);
    console.log("Action:", action);

    // ✅ STEP 1 — Run analysis directly (NO fetch)
    const result = await analyzePR(prUrl);

    if (
      !result?.analysis ||
      !result?.mergeReadiness ||
      !result?.blastRadius ||
      !result?.compliance
    ) {
      throw new Error("Invalid analysis result");
    }

    // ✅ STEP 2 — GitHub App authentication (CORRECT WAY)
    const app = new App({
      appId: process.env.GITHUB_APP_ID!,
      privateKey: process.env.GITHUB_PRIVATE_KEY!.replace(/\\n/g, "\n"),
    });

    const octokit = await app.getInstallationOctokit(installationId);

    // ✅ STEP 3 — Generate comment
    const commentBody = generatePRComment({
      analysis: result.analysis,
      mergeReadiness: result.mergeReadiness,
      blastRadius: result.blastRadius,
      compliance: result.compliance,
      repository: result.repository,
      appUrl: process.env.APP_URL,
    });

    // ✅ STEP 4 — Post comment
    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body: commentBody,
    });

    console.log("✅ Comment posted successfully");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Webhook error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook failed" },
      { status: 500 }
    );
  }
}