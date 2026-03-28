/**
 * Merge Readiness Engine
 * Converts PR signals into a single decision-oriented merge recommendation.
 */

export type MergeReadiness = {
  status: "SAFE" | "CAUTION" | "BLOCK";
  score: number;
  reason: string;
  decisionConfidence: number;
  signalStrength: number;
  decisionType: "LOW_IMPACT_SAFE" | "NORMAL" | "HIGH_RISK";
};

export interface MergeReadinessInput {
  finalRiskLevel: "LOW" | "MEDIUM" | "HIGH";
  complianceRisk: "LOW" | "MEDIUM" | "HIGH";
  impactScore: number;
  signalStrength: number;
  totalFiles: number;
}

const RISK_WEIGHT = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
};

/**
 * Converts analysis signal strength into decision confidence.
 * Larger or broader PRs reduce decision confidence even when the signal is strong.
 */
function normalizeDecisionConfidence(
  signalStrength: number,
  totalFiles: number,
  impactScore: number,
): number {
  const diffSizeWeight = 0.3;
  const complexityWeight = 0.4;
  const ambiguityWeight = 0.3;

  const diffSizeRisk = Math.min(totalFiles / 100, 1);
  const issueSeverityRisk = impactScore / 100;
  const unknownFactors = 1 - signalStrength;

  const decisionConfidence =
    1 -
    diffSizeWeight * diffSizeRisk -
    complexityWeight * issueSeverityRisk -
    ambiguityWeight * unknownFactors;

  return Math.max(0, Math.min(1, decisionConfidence));
}

function calculateCombinedScore(input: MergeReadinessInput): number {
  const llmRisk = RISK_WEIGHT[input.finalRiskLevel] / 3;
  const complianceWeighted = RISK_WEIGHT[input.complianceRisk] / 3;
  const impactFactor = input.impactScore / 100;
  const decisionConfidence = normalizeDecisionConfidence(
    input.signalStrength,
    input.totalFiles,
    input.impactScore,
  );

  const confidenceFactor =
    decisionConfidence < 0.4
      ? 1.2
      : decisionConfidence < 0.6
        ? 1.1
        : decisionConfidence > 0.8
          ? 0.85
          : 1;

  const baseRisk = llmRisk;
  let finalScore =
    (baseRisk * 0.4 + complianceWeighted * 0.3 + impactFactor * 0.3) * 100;

  finalScore *= confidenceFactor;

  return Math.max(0, Math.min(100, finalScore));
}

function determineStatusByRules(
  input: MergeReadinessInput,
  score: number,
): "SAFE" | "CAUTION" | "BLOCK" | null {
  if (
    input.complianceRisk === "HIGH" ||
    (input.finalRiskLevel === "HIGH" && input.impactScore > 65)
  ) {
    return "BLOCK";
  }

  if (input.finalRiskLevel === "HIGH" && input.impactScore <= 40) {
    return "CAUTION";
  }

  if (
    input.complianceRisk === "MEDIUM" ||
    input.impactScore > 35 ||
    score > 45
  ) {
    return "CAUTION";
  }

  return null;
}

function determineStatusByScore(score: number): "SAFE" | "CAUTION" | "BLOCK" {
  if (score >= 70) {
    return "BLOCK";
  }
  if (score >= 40) {
    return "CAUTION";
  }
  return "SAFE";
}

function generateReason(input: MergeReadinessInput, score: number): string {
  const reasons: string[] = [];

  if (input.finalRiskLevel === "HIGH") {
    reasons.push("high-risk change detected");
  }

  if (input.complianceRisk !== "LOW") {
    reasons.push("sensitive logic modified");
  }

  if (input.impactScore > 65) {
    reasons.push("wide system impact");
  } else if (input.impactScore > 35) {
    reasons.push("moderate system impact");
  }

  if (reasons.length === 0) {
    if (score < 20) {
      return "all signals clear for merge";
    }
    if (score < 40) {
      return "acceptable risk profile";
    }
    return "review recommended before merge";
  }

  return reasons.join(", ");
}

export function computeMergeReadiness(
  input: MergeReadinessInput,
): MergeReadiness {
  const score = calculateCombinedScore(input);
  const decisionConfidence = normalizeDecisionConfidence(
    input.signalStrength,
    input.totalFiles,
    input.impactScore,
  );

  let status = determineStatusByRules(input, score);
  if (status === null) {
    status = determineStatusByScore(score);
  }

  const reason = generateReason(input, score);
  const decisionType =
    status === "BLOCK" || input.finalRiskLevel === "HIGH" || input.complianceRisk === "HIGH"
      ? "HIGH_RISK"
      : "NORMAL";

  return {
    status,
    score: Math.round(score),
    reason,
    decisionConfidence,
    signalStrength: input.signalStrength,
    decisionType,
  };
}

export function getStatusColor(status: "SAFE" | "CAUTION" | "BLOCK"): string {
  switch (status) {
    case "SAFE":
      return "green";
    case "CAUTION":
      return "yellow";
    case "BLOCK":
      return "red";
    default:
      return "gray";
  }
}

export function getStatusEmoji(status: "SAFE" | "CAUTION" | "BLOCK"): string {
  switch (status) {
    case "SAFE":
      return "✅";
    case "CAUTION":
      return "⚠️";
    case "BLOCK":
      return "🛑";
    default:
      return "❓";
  }
}
