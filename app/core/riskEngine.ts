/**
 * Risk Scoring Engine
 * Calculates PR risk based on multiple factors:
 * - Diff size (additions/deletions)
 * - Number of issues found
 * - Severity of issues
 */

import {
  PRAnalysis,
  PRAnalysisWithRiskScore,
  RiskLevel,
  RiskScoreBreakdown,
} from "@/app/types/prAnalysis";
import { PRContext } from "@/app/services/contextBuilder";

/**
 * Configuration for risk scoring thresholds
 */
const RISK_CONFIG = {
  diffSize: {
    SMALL_THRESHOLD: 100,
    MEDIUM_THRESHOLD: 500,
    LARGE_THRESHOLD: 1000,
    SMALL_MULTIPLIER: 0.1,
    MEDIUM_MULTIPLIER: 0.3,
    LARGE_MULTIPLIER: 0.6,
    HUGE_MULTIPLIER: 1.0,
  },
  issueCount: {
    LOW_THRESHOLD: 2,
    MEDIUM_THRESHOLD: 5,
    HIGH_THRESHOLD: 10,
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

function calculateDiffSizeRisk(prContext: PRContext): number {
  const totalChanges = prContext.files.reduce(
    (sum, file) => sum + file.additions + file.deletions,
    0,
  );

  if (totalChanges <= RISK_CONFIG.diffSize.SMALL_THRESHOLD) {
    return RISK_CONFIG.diffSize.SMALL_MULTIPLIER;
  }
  if (totalChanges <= RISK_CONFIG.diffSize.MEDIUM_THRESHOLD) {
    return RISK_CONFIG.diffSize.MEDIUM_MULTIPLIER;
  }
  if (totalChanges <= RISK_CONFIG.diffSize.LARGE_THRESHOLD) {
    return RISK_CONFIG.diffSize.LARGE_MULTIPLIER;
  }
  return RISK_CONFIG.diffSize.HUGE_MULTIPLIER;
}

function calculateIssueCountRisk(analysis: PRAnalysis): number {
  const issueCount = analysis.issues.length;

  if (issueCount <= RISK_CONFIG.issueCount.LOW_THRESHOLD) {
    return RISK_CONFIG.issueCount.LOW_RISK;
  }
  if (issueCount <= RISK_CONFIG.issueCount.MEDIUM_THRESHOLD) {
    return RISK_CONFIG.issueCount.MEDIUM_RISK;
  }
  if (issueCount <= RISK_CONFIG.issueCount.HIGH_THRESHOLD) {
    return RISK_CONFIG.issueCount.HIGH_RISK;
  }
  return RISK_CONFIG.issueCount.CRITICAL_RISK;
}

function calculateIssueSeverityRisk(analysis: PRAnalysis): number {
  if (analysis.issues.length === 0) {
    return 0;
  }

  let severityScore = 0;
  for (const issue of analysis.issues) {
    severityScore += RISK_CONFIG.severity[issue.severity];
  }

  return Math.min(1, severityScore / analysis.issues.length);
}

/**
 * Computes dynamic signal strength based on PR characteristics.
 * More data and more reviewable context produce a stronger signal.
 */
function computeSignalStrength(
  prContext: PRContext,
  analysis: PRAnalysis,
): number {
  let score = 0.5;

  const totalFiles = prContext.files.length;
  const totalChanges = prContext.files.reduce(
    (sum, file) => sum + file.additions + file.deletions,
    0,
  );
  const issuesCount = analysis.issues.length;

  if (totalFiles > 5) {
    score += 0.15;
  }
  if (totalFiles > 15) {
    score += 0.1;
  }

  if (totalChanges > 200) {
    score += 0.1;
  }
  if (totalChanges > 1000) {
    score += 0.05;
  }

  if (issuesCount > 0) {
    score += 0.1;
  }

  return Math.min(score, 0.95);
}

function scoreToRiskLevel(score: number): RiskLevel {
  if (score < 0.33) {
    return "LOW";
  }
  if (score < 0.67) {
    return "MEDIUM";
  }
  return "HIGH";
}

function calculateOverallRiskScore(
  diffSizeRisk: number,
  issueCountRisk: number,
  issueSeverityRisk: number,
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

function generateRiskRationale(
  diffSizeRisk: number,
  _issueCountRisk: number,
  _issueSeverityRisk: number,
  analysis: PRAnalysis,
  prContext: PRContext,
): string {
  const factors: string[] = [];

  const totalChanges = prContext.files.reduce(
    (sum, file) => sum + file.additions + file.deletions,
    0,
  );

  if (diffSizeRisk > 0.6) {
    factors.push(`large diff size (${totalChanges} total changes)`);
  } else if (diffSizeRisk > 0.3) {
    factors.push(`moderate diff size (${totalChanges} total changes)`);
  }

  if (analysis.issues.length > 0) {
    factors.push(
      `${analysis.issues.length} issue(s) found: ${analysis.issues
        .map((issue) => `${issue.severity} ${issue.type}`)
        .join(", ")}`,
    );
  }

  if (factors.length === 0) {
    return "Low risk: minimal changes, no issues detected";
  }

  return `Risk factors: ${factors.join("; ")}`;
}

export function calculateRiskScore(
  analysis: PRAnalysis,
  prContext: PRContext,
): RiskScoreBreakdown {
  const diffSizeRisk = calculateDiffSizeRisk(prContext);
  const issueCountRisk = calculateIssueCountRisk(analysis);
  const issueSeverityRisk = calculateIssueSeverityRisk(analysis);

  const finalRiskScore = calculateOverallRiskScore(
    diffSizeRisk,
    issueCountRisk,
    issueSeverityRisk,
  );

  const rationale = generateRiskRationale(
    diffSizeRisk,
    issueCountRisk,
    issueSeverityRisk,
    analysis,
    prContext,
  );

  return {
    diffSizeRisk,
    issueCountRisk,
    issueSeverityRisk,
    finalRiskScore: Math.round(finalRiskScore * 100),
    rationale,
  };
}

export function enhanceAnalysisWithRiskScore(
  analysis: PRAnalysis,
  prContext: PRContext,
): PRAnalysisWithRiskScore {
  const riskScoreBreakdown = calculateRiskScore(analysis, prContext);
  const computedRiskLevel = scoreToRiskLevel(
    riskScoreBreakdown.finalRiskScore / 100,
  );
  const signalStrength = computeSignalStrength(prContext, analysis);

  return {
    ...analysis,
    signalStrength,
    computedRiskLevel,
    riskScoreBreakdown,
  };
}

export function determineFinalRiskLevel(
  analysis: PRAnalysisWithRiskScore,
): RiskLevel {
  const RISK_PRIORITY = {
    LOW: 1,
    MEDIUM: 2,
    HIGH: 3,
  };

  const llmRiskValue = RISK_PRIORITY[analysis.riskLevel];
  const computedRiskValue = RISK_PRIORITY[analysis.computedRiskLevel];

  return llmRiskValue >= computedRiskValue
    ? analysis.riskLevel
    : analysis.computedRiskLevel;
}
