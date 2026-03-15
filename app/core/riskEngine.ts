/**
 * Risk Scoring Engine
 * Calculates PR risk based on multiple factors:
 * - Diff size (additions/deletions)
 * - Number of issues found
 * - Severity of issues
 */

import { PRAnalysis, RiskLevel, RiskScoreBreakdown, PRAnalysisWithRiskScore } from "@/app/types/prAnalysis";
import { PRContext } from "@/app/services/contextBuilder";

/**
 * Configuration for risk scoring thresholds
 */
const RISK_CONFIG = {
  diffSize: {
    SMALL_THRESHOLD: 100, // Lines
    MEDIUM_THRESHOLD: 500, // Lines
    LARGE_THRESHOLD: 1000, // Lines
    // Risk multipliers
    SMALL_MULTIPLIER: 0.1,
    MEDIUM_MULTIPLIER: 0.3,
    LARGE_MULTIPLIER: 0.6,
    HUGE_MULTIPLIER: 1.0,
  },
  issueCount: {
    LOW_THRESHOLD: 2,
    MEDIUM_THRESHOLD: 5,
    HIGH_THRESHOLD: 10,
    // Risk multipliers
    LOW_RISK: 0.1,
    MEDIUM_RISK: 0.4,
    HIGH_RISK: 0.8,
    CRITICAL_RISK: 1.0,
  },
  severity: {
    LOW: 0.1,
    MEDIUM: 0.4,
    HIGH: 1.0,
  },
};

/**
 * Calculates risk from diff size
 * Larger diffs = higher risk
 */
function calculateDiffSizeRisk(prContext: PRContext): number {
  const totalChanges = prContext.files.reduce(
    (sum, file) => sum + file.additions + file.deletions,
    0
  );

  if (totalChanges <= RISK_CONFIG.diffSize.SMALL_THRESHOLD) {
    return RISK_CONFIG.diffSize.SMALL_MULTIPLIER;
  } else if (totalChanges <= RISK_CONFIG.diffSize.MEDIUM_THRESHOLD) {
    return RISK_CONFIG.diffSize.MEDIUM_MULTIPLIER;
  } else if (totalChanges <= RISK_CONFIG.diffSize.LARGE_THRESHOLD) {
    return RISK_CONFIG.diffSize.LARGE_MULTIPLIER;
  } else {
    return RISK_CONFIG.diffSize.HUGE_MULTIPLIER;
  }
}

/**
 * Calculates risk from number of issues
 */
function calculateIssueCountRisk(analysis: PRAnalysis): number {
  const issueCount = analysis.issues.length;

  if (issueCount <= RISK_CONFIG.issueCount.LOW_THRESHOLD) {
    return RISK_CONFIG.issueCount.LOW_RISK;
  } else if (issueCount <= RISK_CONFIG.issueCount.MEDIUM_THRESHOLD) {
    return RISK_CONFIG.issueCount.MEDIUM_RISK;
  } else if (issueCount <= RISK_CONFIG.issueCount.HIGH_THRESHOLD) {
    return RISK_CONFIG.issueCount.HIGH_RISK;
  } else {
    return RISK_CONFIG.issueCount.CRITICAL_RISK;
  }
}

/**
 * Calculates risk from severity of issues
 * Weight = (count_high * 1.0 + count_medium * 0.4 + count_low * 0.1) / total_issues
 */
function calculateIssueSeverityRisk(analysis: PRAnalysis): number {
  if (analysis.issues.length === 0) {
    return 0;
  }

  let severityScore = 0;
  for (const issue of analysis.issues) {
    severityScore += RISK_CONFIG.severity[issue.severity];
  }

  // Average the risk score
  return Math.min(1, severityScore / analysis.issues.length);
}

/**
 * Converts numeric score (0-1) to risk level
 */
function scoreToRiskLevel(score: number): RiskLevel {
  if (score < 0.33) {
    return "LOW";
  } else if (score < 0.67) {
    return "MEDIUM";
  } else {
    return "HIGH";
  }
}

/**
 * Calculates overall risk score using weighted average
 * Weights: diff size (40%), issue count (35%), severity (25%)
 */
function calculateOverallRiskScore(
  diffSizeRisk: number,
  issueCountRisk: number,
  issueSeverityRisk: number
): number {
  const weights = {
    diffSize: 0.4,
    issueCount: 0.35,
    severity: 0.25,
  };

  return (
    diffSizeRisk * weights.diffSize +
    issueCountRisk * weights.issueCount +
    issueSeverityRisk * weights.severity
  );
}

/**
 * Generates a human-readable rationale for the risk score
 */
function generateRiskRationale(
  diffSizeRisk: number,
  issueCountRisk: number,
  issueSeverityRisk: number,
  analysis: PRAnalysis,
  prContext: PRContext
): string {
  const factors: string[] = [];

  const totalChanges = prContext.files.reduce(
    (sum, file) => sum + file.additions + file.deletions,
    0
  );

  if (diffSizeRisk > 0.6) {
    factors.push(`large diff size (${totalChanges} total changes)`);
  } else if (diffSizeRisk > 0.3) {
    factors.push(`moderate diff size (${totalChanges} total changes)`);
  }

  if (analysis.issues.length > 0) {
    factors.push(
      `${analysis.issues.length} issue(s) found: ${analysis.issues
        .map((i) => `${i.severity} ${i.type}`)
        .join(", ")}`
    );
  }

  if (analysis.confidenceScore < 0.5) {
    factors.push("low confidence in analysis");
  }

  if (factors.length === 0) {
    return "Low risk: minimal changes, no issues detected";
  }

  return `Risk factors: ${factors.join("; ")}`;
}

/**
 * Main risk scoring function
 * Takes LLM analysis and PR context and computes risk breakdown
 */
export function calculateRiskScore(
  analysis: PRAnalysis,
  prContext: PRContext
): RiskScoreBreakdown {
  const diffSizeRisk = calculateDiffSizeRisk(prContext);
  const issueCountRisk = calculateIssueCountRisk(analysis);
  const issueSeverityRisk = calculateIssueSeverityRisk(analysis);

  const finalRiskScore = calculateOverallRiskScore(
    diffSizeRisk,
    issueCountRisk,
    issueSeverityRisk
  );

  const rationale = generateRiskRationale(
    diffSizeRisk,
    issueCountRisk,
    issueSeverityRisk,
    analysis,
    prContext
  );

  return {
    diffSizeRisk,
    issueCountRisk,
    issueSeverityRisk,
    finalRiskScore: Math.round(finalRiskScore * 100),
    rationale,
  };
}

/**
 * Extends analysis with computed risk level
 */
export function enhanceAnalysisWithRiskScore(
  analysis: PRAnalysis,
  prContext: PRContext
): PRAnalysisWithRiskScore {
  const riskScoreBreakdown = calculateRiskScore(analysis, prContext);
  const computedRiskLevel = scoreToRiskLevel(riskScoreBreakdown.finalRiskScore / 100);

  return {
    ...analysis,
    computedRiskLevel,
    riskScoreBreakdown,
  };
}

/**
 * Determines final risk level - uses computed score or LLM's risk level
 * Compares both and uses the higher risk level
 */
export function determineFinalRiskLevel(
  analysis: PRAnalysisWithRiskScore
): RiskLevel {
  const riskPriority = { LOW: 0, MEDIUM: 1, HIGH: 2 };

  const llmRiskValue = riskPriority[analysis.riskLevel];
  const computedRiskValue = riskPriority[analysis.computedRiskLevel];

  // Return the higher risk level
  return llmRiskValue >= computedRiskValue
    ? analysis.riskLevel
    : analysis.computedRiskLevel;
}
