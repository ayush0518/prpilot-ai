/**
 * Merge Readiness Engine
 * Converts all PR signals into a single, deterministic merge decision
 * Combines: risk level, compliance, blast radius, and confidence score
 * 
 * Output: SAFE | CAUTION | BLOCK decision with reasoning
 */

/**
 * Merge readiness decision output (with confidence included)
 */
export type MergeReadiness = {
  status: "SAFE" | "CAUTION" | "BLOCK";
  score: number; // 0-100
  reason: string;
  confidenceLevel: "HIGH" | "MEDIUM" | "LOW"; // Deterministic confidence override
  confidenceScore: number; // 0-1 (normalized confidence)
};

/**
 * Input signals for merge readiness decision
 */
export interface MergeReadinessInput {
  finalRiskLevel: "LOW" | "MEDIUM" | "HIGH";
  complianceRisk: "LOW" | "MEDIUM" | "HIGH";
  impactScore: number; // 0-100
  confidenceScore: number; // 0-1
  totalFiles: number; // Number of files changed (for deterministic confidence)
}

// ===== PART 2: RISK WEIGHT MAPPING =====
const RISK_WEIGHT = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
};

// ===== PART 2B: DETERMINISTIC CONFIDENCE CALCULATION =====
/**
 * Overrides LLM confidence with deterministic logic based on PR size and impact
 * 
 * Rules:
 * - HIGH: If totalFiles < 5 AND impactScore < 20 (small, focused change)
 * - MEDIUM: If totalFiles < 20 (moderate PR size)
 * - LOW: Otherwise (large or complex PR)
 */
function calculateDeterministicConfidence(totalFiles: number, impactScore: number): "HIGH" | "MEDIUM" | "LOW" {
  if (totalFiles < 5 && impactScore < 20) {
    return "HIGH";
  }
  if (totalFiles < 20) {
    return "MEDIUM";
  }
  return "LOW";
}

/**
 * Converts LLM confidence score (0-1) using weighted formula
 * Formula: confidenceScore = 1 - (diffSizeWeight * diffSizeRisk) - (complexityWeight * issueSeverityRisk) - (ambiguityWeight * unknownFactors)
 * 
 * Input: LLM confidence (0-1), totalFiles, impactScore
 * Output: Normalized confidence score (0-1)
 */
function normalizeConfidenceScore(llmConfidence: number, totalFiles: number, impactScore: number): number {
  // Weights for different risk factors
  const diffSizeWeight = 0.3;
  const complexityWeight = 0.4;
  const ambiguityWeight = 0.3;
  
  // Calculate diff size risk (higher files = higher risk to confidence)
  const diffSizeRisk = Math.min(totalFiles / 100, 1); // 0-1, caps at 100 files
  
  // Calculate complexity risk (based on impact score)
  const issueSeverityRisk = impactScore / 100; // Normalize impact to 0-1
  
  // Unknown factors (based on inverse of LLM confidence)
  const unknownFactors = 1 - llmConfidence;
  
  // Apply weighted formula
  let confidenceScore = 
    1 - 
    (diffSizeWeight * diffSizeRisk) - 
    (complexityWeight * issueSeverityRisk) - 
    (ambiguityWeight * unknownFactors);
  
  // Clamp to 0-1 range
  return Math.max(0, Math.min(1, confidenceScore));
}

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
  
  // Step 3: Calculate normalized confidence score using the weighted formula
  const normalizedConfidence = normalizeConfidenceScore(input.confidenceScore, input.totalFiles, input.impactScore);
  
  // Step 4: Confidence adjustment (low confidence = increase caution)
  const confidenceFactor =
    normalizedConfidence < 0.4
      ? 1.2 // Significantly increase caution for low confidence
      : normalizedConfidence < 0.6
      ? 1.1 // Moderately increase caution for medium-low confidence
      : normalizedConfidence > 0.8
      ? 0.85 // Slightly reduce risk for high confidence
      : 1;
  
  // Step 5: Base risk (blend risk signals)
  const baseRisk = llmRisk;
  
  // Step 6: Combined score = weighted formula
  let finalScore =
    (baseRisk * 0.4 +
     complianceWeighted * 0.3 +
     impactFactor * 0.3) * 100;
  
  // Step 7: Apply confidence adjustment
  finalScore = finalScore * confidenceFactor;
  
  // Step 8: Clamp to 0-100
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

  // Step 2: Calculate deterministic confidence level
  const confidenceLevel = calculateDeterministicConfidence(input.totalFiles, input.impactScore);
  
  // Step 3: Normalize confidence score using weighted formula
  const normalizedConfidenceScore = normalizeConfidenceScore(input.confidenceScore, input.totalFiles, input.impactScore);

  // Step 4: Apply decision rules FIRST
  let status = determineStatusByRules(input, score);

  // Step 5: Fallback to score-based decision if no rule applies
  if (status === null) {
    status = determineStatusByScore(score);
  }

  // Step 6: Generate reason
  const reason = generateReason(input, score);

  return {
    status,
    score: Math.round(score),
    reason,
    confidenceLevel,
    confidenceScore: normalizedConfidenceScore,
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
