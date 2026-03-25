import "@/app/lib/debugFetch";
import { NextRequest, NextResponse } from "next/server";
import { Octokit } from "@octokit/rest";
import { createAppAuth } from "@octokit/auth-app";
import { analyzePR } from "@/app/services/analyzePR";
import { generatePRComment } from "@/app/utils/prCommentFormatter";

const originalFetch = global.fetch;

global.fetch = async (...args) => {
  console.log("🔥 FETCH CALLED:", args[0]);
  return originalFetch(...args);
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PullRequestAction = "opened" | "synchronize";

interface PullRequestWebhookPayload {
  action?: string;
  pull_request?: {
    html_url?: string;
    number?: number;
  };
  repository?: {
    name?: string;
    owner?: {
      login?: string;
    };
  };
  installation?: {
    id?: number;
  };
}

function asErrorDetails(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    const octokitError = error as Error & {
      status?: number;
      response?: { data?: unknown };
    };

    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      status: octokitError.status,
      response: octokitError.response?.data,
    };
  }

  return { message: String(error) };
}

function getAppUrl(req: NextRequest): string | undefined {
  const configuredUrl = process.env.APP_URL?.trim();
  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, "");
  }

  try {
    return new URL(req.url).origin;
  } catch {
    return undefined;
  }
}

function getGitHubAppCredentials(): { appId: string; privateKey: string } {
  const appId = process.env.GITHUB_APP_ID?.trim();
  const rawPrivateKey = process.env.GITHUB_PRIVATE_KEY;

  if (!appId) {
    throw new Error("Missing required environment variable: GITHUB_APP_ID");
  }

  if (!rawPrivateKey) {
    throw new Error("Missing required environment variable: GITHUB_PRIVATE_KEY");
  }

  return {
    appId,
    privateKey: rawPrivateKey.replace(/\\n/g, "\n"),
  };
}

function isSupportedAction(action: string | undefined): action is PullRequestAction {
  return action === "opened" || action === "synchronize";
}

export async function POST(req: NextRequest) {
  const event = req.headers.get("x-github-event");
  const deliveryId = req.headers.get("x-github-delivery") ?? "unknown-delivery";

  let payload: PullRequestWebhookPayload;
  try {
    payload = (await req.json()) as PullRequestWebhookPayload;
  } catch (error) {
    console.error(`[webhook:${deliveryId}] Invalid JSON payload`, asErrorDetails(error));
    return NextResponse.json({ success: false, error: "Invalid JSON payload" }, { status: 400 });
  }

  if (event !== "pull_request") {
    return NextResponse.json({ success: true, ignored: true, reason: "event_not_supported" });
  }

  if (!isSupportedAction(payload.action)) {
    return NextResponse.json({ success: true, ignored: true, reason: "action_not_supported" });
  }

  const prUrl = payload.pull_request?.html_url;
  const prNumber = payload.pull_request?.number;
  const repo = payload.repository?.name;
  const owner = payload.repository?.owner?.login;
  const installationId = payload.installation?.id;

  if (!prUrl || !prNumber || !repo || !owner || !installationId) {
    console.error(`[webhook:${deliveryId}] Missing required webhook fields`, {
      hasPrUrl: Boolean(prUrl),
      hasPrNumber: Boolean(prNumber),
      hasRepo: Boolean(repo),
      hasOwner: Boolean(owner),
      hasInstallationId: Boolean(installationId),
    });
    return NextResponse.json(
      { success: false, error: "Missing required webhook payload fields" },
      { status: 400 }
    );
  }

  const appUrl = getAppUrl(req);
  console.log("Using APP_URL:", appUrl);
  console.log(`[webhook:${deliveryId}] Processing PR`, {
    action: payload.action,
    prUrl,
    repo: `${owner}/${repo}`,
    hasAppUrl: Boolean(appUrl),
    appUrl: appUrl ?? null,
    hasGithubAppId: Boolean(process.env.GITHUB_APP_ID),
    hasGithubPrivateKey: Boolean(process.env.GITHUB_PRIVATE_KEY),
  });

  try {
    const result = await analyzePR(prUrl);
    const { appId, privateKey } = getGitHubAppCredentials();
    const mergeReadiness = result.mergeReadiness;
    const blastRadius = result.blastRadius;
    const compliance = result.compliance;

    if (!mergeReadiness || !blastRadius || !compliance) {
      throw new Error("Analysis result was incomplete; required fields are missing");
    }

    const octokit = new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId,
        privateKey,
        installationId,
      },
    });

    const commentBody = generatePRComment({
      analysis: result.analysis,
      mergeReadiness,
      blastRadius,
      compliance,
      repository: result.repository,
      appUrl,
    });

    await octokit.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body: commentBody,
    });

    console.log(`[webhook:${deliveryId}] Comment posted successfully`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`[webhook:${deliveryId}] Webhook processing failed`, asErrorDetails(error));
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Webhook processing failed",
      },
      { status: 500 }
    );
  }
}
