/**
 * Merge Readiness Engine
 * Converts all PR signals into a single, deterministic merge decision
 * Combines: risk level, compliance, blast radius, and confidence score
 * 
 * Output: SAFE | CAUTION | BLOCK decision with reasoning
 */

/**
 * Merge readiness decision output
 */
export type MergeReadiness = {
  status: "SAFE" | "CAUTION" | "BLOCK";
  score: number; // 0-100
  reason: string;
};

/**
 * Input signals for merge readiness decision
 */
export interface MergeReadinessInput {
  finalRiskLevel: "LOW" | "MEDIUM" | "HIGH";
  complianceRisk: "LOW" | "MEDIUM" | "HIGH";
  impactScore: number; // 0-100
  confidenceScore: number; // 0-1
}

// ===== PART 2: RISK WEIGHT MAPPING =====
const RISK_WEIGHT = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
};

/**
 * PART 3: Calculate combined risk score using weighted + rule-based logic
 * 
 * Approach:
 * 1. Normalize all signals to 0-1 range using weights
 * 2. Apply compliance sensitivity
 * 3. Factor in impact
 * 4. Adjust for confidence level
 * 5. Combine with weighted formula
 */
function calculateCombinedScore(input: MergeReadinessInput): number {
  // Step 1: Extract weighted risk values (0-1 scale)
  const llmRisk = RISK_WEIGHT[input.finalRiskLevel] / 3;
  const complianceWeighted = RISK_WEIGHT[input.complianceRisk] / 3;
  
  // Step 2: Normalize impact to 0-1
  const impactFactor = input.impactScore / 100;
  
  // Step 3: Confidence is already 0-1
  const confidenceFactor =
    input.confidenceScore < 0.6
      ? 1.1 // increase caution
      : input.confidenceScore > 0.85
      ? 0.9 // slightly reduce risk
      : 1;
  
  // Step 4: Base risk (blend risk signals)
  const baseRisk = llmRisk;
  
  // Step 5: Combined score = weighted formula
  let finalScore =
    (baseRisk * 0.4 +
     complianceWeighted * 0.3 +
     impactFactor * 0.3) * 100;
  
  // Step 6: Apply confidence adjustment
  finalScore = finalScore * confidenceFactor;
  
  // Step 7: Clamp to 0-100
  finalScore = Math.max(0, Math.min(100, finalScore));
  
  return finalScore;
}

/**
 * PART 4: Apply decision rules FIRST (before score-based thresholds)
 * These rules handle critical scenarios and mixed signals
 */
function determineStatusByRules(input: MergeReadinessInput, score: number): "SAFE" | "CAUTION" | "BLOCK" | null {
  // Rule 1: HARD BLOCK (only real danger)
  if (
    input.complianceRisk === "HIGH" ||
    (input.finalRiskLevel === "HIGH" && input.impactScore > 65)
  ) {
    return "BLOCK";
  }

  // Rule 2: HIGH risk but LOW impact (special case - don't over-block)
  // Note: complianceRisk !== "HIGH" is implicit (Rule 1 already caught that)
  if (
    input.finalRiskLevel === "HIGH" &&
    input.impactScore <= 40
  ) {
    return "CAUTION";
  }

  // Rule 3: Medium combinations trigger caution
  if (
    input.complianceRisk === "MEDIUM" ||
    input.impactScore > 35 ||
    score > 45
  ) {
    return "CAUTION";
  }

  // No rule applies, will use score-based fallback
  return null;
}

/**
 * PART 5: Fallback to score-based decision if rules don't apply
 */
function determineStatusByScore(score: number): "SAFE" | "CAUTION" | "BLOCK" {
  if (score >= 70) {
    return "BLOCK";
  } else if (score >= 40) {
    return "CAUTION";
  } else {
    return "SAFE";
  }
}

/**
 * PART 6: Generate detailed, reason-based explanation
 */
function generateReason(input: MergeReadinessInput, score: number): string {
  const reasons: string[] = [];

  // Risk factors
  if (input.finalRiskLevel === "HIGH") {
    reasons.push("high-risk change detected");
  }

  // Compliance factors
  if (input.complianceRisk !== "LOW") {
    reasons.push("sensitive logic modified");
  }

  // Impact factors
  if (input.impactScore > 65) {
    reasons.push("wide system impact");
  } else if (input.impactScore > 35) {
    reasons.push("moderate system impact");
  }

  // Confidence factors
  if (input.confidenceScore < 0.6) {
    reasons.push("low confidence in analysis");
  }

  // Fallback reason if no specific factors
  if (reasons.length === 0) {
    if (score < 20) {
      return "all signals clear for merge";
    } else if (score < 40) {
      return "acceptable risk profile";
    } else {
      return "please review before merge";
    }
  }

  return reasons.join(", ");
}

/**
 * Main function: Computes merge readiness decision
 * Combines weighted scoring + rule-based logic for balanced decisions
 */
export function computeMergeReadiness(input: MergeReadinessInput): MergeReadiness {
  // Step 1: Calculate combined score (0-100)
  const score = calculateCombinedScore(input);

  // Step 2: Apply decision rules FIRST
  let status = determineStatusByRules(input, score);

  // Step 3: Fallback to score-based decision if no rule applies
  if (status === null) {
    status = determineStatusByScore(score);
  }

  // Step 4: Generate reason
  const reason = generateReason(input, score);

  return {
    status,
    score: Math.round(score),
    reason,
  };
}

/**
 * Status color mapping for UI
 */
export function getStatusColor(status: "SAFE" | "CAUTION" | "BLOCK"): string {
  switch (status) {
    case "SAFE":
      return "green"; // #10b981
    case "CAUTION":
      return "yellow"; // #f59e0b
    case "BLOCK":
      return "red"; // #ef4444
    default:
      return "gray";
  }
}

/**
 * Status emoji for UI
 */
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
