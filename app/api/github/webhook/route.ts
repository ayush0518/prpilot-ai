import { NextRequest, NextResponse } from "next/server";
import { Octokit } from "@octokit/rest";
import { createAppAuth } from "@octokit/auth-app";
import { generatePRComment } from "@/app/utils/prCommentFormatter";

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const event = req.headers.get("x-github-event");

    if (event === "pull_request") {
      const action = payload.action;

      if (action === "opened" || action === "synchronize") {
        const pr = payload.pull_request;

        const prUrl = pr.html_url;
        const repo = payload.repository.name;
        const owner = payload.repository.owner.login;
        const prNumber = pr.number;
        const installationId = payload.installation.id;

        console.log("Processing PR:", prUrl);

        // STEP 1 — Call MergeMind analyzer
        const analysisResponse = await fetch(
          `${process.env.APP_URL}/api/analyze-pr/v2`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ pr_url: prUrl }),
          }
        );

        const data = await analysisResponse.json();

        // STEP 2 — Setup GitHub client
        const octokit = new Octokit({
          authStrategy: createAppAuth,
          auth: {
            appId: process.env.GITHUB_APP_ID!,
            privateKey: process.env.GITHUB_PRIVATE_KEY!,
            installationId: installationId,
          },
        });

        // STEP 3 — Format comment using new formatter
        const body = generatePRComment({
          analysis: data.analysis,
          mergeReadiness: data.mergeReadiness,
          blastRadius: data.blastRadius,
          compliance: data.compliance,
          repository: {
            ...data.repository,
            changedFiles: data.repository?.changedFiles || [],
            totalFiles: data.repository?.totalFiles || 0,
            prUrl,
          },
          appUrl: process.env.APP_URL
        });

        // STEP 4 — Post comment
        await octokit.issues.createComment({
          owner,
          repo,
          issue_number: prNumber,
          body,
        });

        console.log("Comment posted successfully");
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
  }
}
