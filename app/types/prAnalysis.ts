/**
 * Type definitions for PR Analysis
 * Used across parser, risk engine, and UI components
 */

// Issue severity levels
export type IssueSeverity = "LOW" | "MEDIUM" | "HIGH";

// Issue types
export type IssueType = "bug" | "security" | "performance" | "maintainability";

// Risk levels
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

/**
 * Represents a single code issue found during PR analysis
 */
export interface PRIssue {
  type: IssueType;
  file: string;
  description: string;
  severity: IssueSeverity;
  suggestion: string;
}

/**
 * Core PR analysis result returned by LLM
 */
export interface PRAnalysis {
  summary: string;
  riskLevel: RiskLevel;
  issues: PRIssue[];
  improvements: string[];
  confidenceScore: number;
}

/**
 * Extended analysis with computed risk engine score
 */
export interface PRAnalysisWithRiskScore extends PRAnalysis {
  computedRiskLevel: RiskLevel;
  riskScoreBreakdown: RiskScoreBreakdown;
}

/**
 * Breakdown of how the risk score was calculated
 */
export interface RiskScoreBreakdown {
  diffSizeRisk: number; // 0-1
  issueCountRisk: number; // 0-1
  issueSeverityRisk: number; // 0-1
  finalRiskScore: number; // 0-100
  rationale: string;
}

/**
 * Represents a single file affected within a layer
 */
export interface LayerFile {
  path: string;
  reason: string;
  changeType: "core" | "supporting" | "config";
  isCritical: boolean;
}

/**
 * Details for files affected in a specific layer
 */
export interface LayerDetailsData {
  count: number;
  files: LayerFile[];
}

/**
 * Blast radius information showing which architectural layers are affected
 */
export interface BlastRadius {
  affectedLayers: string[];
  layerCounts: Record<string, number>;
  impactScore: number;
  explanation: string;
  layerDetails: Record<string, LayerDetailsData>;
}

/**
 * Compliance detection result for security-sensitive changes
 */
export interface ComplianceResult {
  flags: {
    auth: boolean;
    payment: boolean;
    pii: boolean;
    security: boolean;
  };
  warnings: string[];
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  details: {
    authFiles: string[];
    paymentFiles: string[];
    piiFiles: string[];
    securityFiles: string[];
  };
}

/**
 * Merge readiness decision - single, deterministic decision for PR merge
 * Combines all signals: risk, compliance, impact, and confidence
 */
export interface MergeReadiness {
  status: "SAFE" | "CAUTION" | "BLOCK";
  score: number; // 0-100
  reason: string;
}

/**
 * LLM response container before parsing
 */
export interface LLMResponseContainer {
  rawText: string;
  parsedAnalysis?: PRAnalysis;
  parseError?: string;
}

/**
 * Result of LLM response parsing
 */
export interface ParseLLMResult {
  success: boolean;
  analysis?: PRAnalysis;
  error?: string;
}

/**
 * Complete structured analysis for UI display
 */
export interface UIAnalysisDisplay {
  analysis: PRAnalysisWithRiskScore;
  displayMetadata: {
    analyzedAt: string;
    totalIssuesFound: number;
    issuesByType: Record<IssueType, number>;
    issuesBySeverity: Record<IssueSeverity, number>;
  };
}
