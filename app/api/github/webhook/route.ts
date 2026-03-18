import { NextRequest, NextResponse } from "next/server";
import { Octokit } from "@octokit/rest";
import { createAppAuth } from "@octokit/auth-app";

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
          "http://localhost:3000/api/analyze-pr/v2",
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

        // STEP 3 — Format comment
        const body = formatComment(data);

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

function formatComment(data: any) {
  const decision = data.mergeReadiness;

  const emoji =
    decision.status === "SAFE"
      ? "🟢"
      : decision.status === "CAUTION"
        ? "🟡"
        : "🔴";

  return `
## 🤖 MergeMind Analysis

### ${emoji} ${decision.status}

**Reason:** ${decision.reason}

---

### 🔍 Key Insights

* Risk: ${data.finalRiskLevel}
* Impact Score: ${data.blastRadius.impactScore}
* Compliance: ${data.compliance.riskLevel}

---

### 🔥 Critical Files

${getCriticalFiles(data)}

---

### ✅ Suggested Improvements

${data.analysis.improvements
  .map((i: string) => `- ${i}`)
  .join("\n")}
`;
}

function getCriticalFiles(data: any) {
  const layers = data.blastRadius.layerDetails;

  const criticalFiles: string[] = [];

  Object.values(layers).forEach((layer: any) => {
    layer.files.forEach((file: any) => {
      if (file.isCritical) {
        criticalFiles.push(`- ${file.path}`);
      }
    });
  });

  return criticalFiles.join("\n") || "None";
}
