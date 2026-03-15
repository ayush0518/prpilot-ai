/**
 * LLM Response Parser
 * Safely extracts and parses JSON from OpenAI responses, even if extra text appears
 */

import { PRAnalysis, ParseLLMResult } from "@/app/types/prAnalysis";

/**
 * Attempts to extract JSON from a raw LLM response
 * Handles cases where the LLM includes text before/after JSON
 */
function extractJSON(text: string): string | null {
  if (!text || typeof text !== "string") {
    return null;
  }

  // First, try to find complete JSON object
  // Look for opening { and find matching closing }
  const openBraceIndex = text.indexOf("{");
  if (openBraceIndex === -1) {
    return null;
  }

  // Find the last closing brace
  const closeBraceIndex = text.lastIndexOf("}");
  if (closeBraceIndex === -1 || closeBraceIndex <= openBraceIndex) {
    return null;
  }

  // Extract potential JSON
  const potentialJSON = text.substring(openBraceIndex, closeBraceIndex + 1);
  return potentialJSON;
}

/**
 * Validates that a parsed analysis has all required fields
 */
function validateAnalysisStructure(data: unknown): data is PRAnalysis {
  if (typeof data !== "object" || data === null) {
    return false;
  }

  const obj = data as Record<string, unknown>;

  // Check required fields
  const hasRequiredFields =
    typeof obj.summary === "string" &&
    typeof obj.riskLevel === "string" &&
    Array.isArray(obj.issues) &&
    Array.isArray(obj.improvements) &&
    typeof obj.confidenceScore === "number";

  if (!hasRequiredFields) {
    return false;
  }

  // Validate risk level
  const validRiskLevels = ["LOW", "MEDIUM", "HIGH"];
  if (!validRiskLevels.includes((obj.riskLevel as string).toUpperCase())) {
    return false;
  }

  // Validate issues array structure
  const issuesValid = (obj.issues as unknown[]).every((issue) => {
    if (typeof issue !== "object" || issue === null) {
      return false;
    }
    const issueObj = issue as Record<string, unknown>;
    return (
      typeof issueObj.type === "string" &&
      typeof issueObj.file === "string" &&
      typeof issueObj.description === "string" &&
      typeof issueObj.severity === "string" &&
      typeof issueObj.suggestion === "string"
    );
  });

  // Validate improvements array
  const improvementsValid = (obj.improvements as unknown[]).every(
    (imp) => typeof imp === "string"
  );

  // Validate confidence score range
  const confidenceValid =
    obj.confidenceScore >= 0 && obj.confidenceScore <= 1;

  return issuesValid && improvementsValid && confidenceValid;
}

/**
 * Normalizes risk level to uppercase
 */
function normalizeRiskLevel(level: string): "LOW" | "MEDIUM" | "HIGH" {
  const normalized = level.toUpperCase();
  if (normalized === "LOW") return "LOW";
  if (normalized === "MEDIUM") return "MEDIUM";
  if (normalized === "HIGH") return "HIGH";
  return "MEDIUM"; // Default fallback
}

/**
 * Normalizes issue severity level
 */
function normalizeSeverity(severity: string): "LOW" | "MEDIUM" | "HIGH" {
  const normalized = severity.toUpperCase();
  if (normalized === "LOW") return "LOW";
  if (normalized === "MEDIUM") return "MEDIUM";
  if (normalized === "HIGH") return "HIGH";
  return "MEDIUM"; // Default fallback
}

/**
 * Normalizes issue type
 */
function normalizeIssueType(type: string): "bug" | "security" | "performance" | "maintainability" {
  const normalized = type.toLowerCase();
  if (normalized === "bug") return "bug";
  if (normalized === "security") return "security";
  if (normalized === "performance") return "performance";
  if (normalized === "maintainability") return "maintainability";
  return "maintainability"; // Default fallback
}

/**
 * Main parser function - safely parses LLM response
 */
export function parseLLMResponse(rawResponse: string): ParseLLMResult {
  try {
    // Step 1: Extract JSON from raw response
    const jsonString = extractJSON(rawResponse);
    if (!jsonString) {
      return {
        success: false,
        error: "No JSON found in LLM response",
      };
    }

    // Step 2: Parse JSON
    let parsedData: unknown;
    try {
      parsedData = JSON.parse(jsonString);
    } catch (parseError) {
      const errorMsg =
        parseError instanceof Error
          ? parseError.message
          : "Invalid JSON syntax";
      return {
        success: false,
        error: `Failed to parse JSON: ${errorMsg}`,
      };
    }

    // Step 3: Validate structure
    if (!validateAnalysisStructure(parsedData)) {
      return {
        success: false,
        error: "Parsed data does not match required PRAnalysis structure",
      };
    }

    // Step 4: Normalize and type-safe conversion
    const analysis: PRAnalysis = {
      summary: parsedData.summary.trim(),
      riskLevel: normalizeRiskLevel(parsedData.riskLevel),
      issues: parsedData.issues.map((issue) => ({
        type: normalizeIssueType(issue.type),
        file: String(issue.file).trim(),
        description: String(issue.description).trim(),
        severity: normalizeSeverity(issue.severity),
        suggestion: String(issue.suggestion).trim(),
      })),
      improvements: parsedData.improvements.map((imp) => String(imp).trim()),
      confidenceScore: Math.min(1, Math.max(0, parsedData.confidenceScore)),
    };

    return {
      success: true,
      analysis,
    };
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : "Unknown parsing error";

    // Log detailed error for debugging
    console.error("[parseLLMResponse] Unexpected error:", {
      errorMsg,
      rawResponseLength: rawResponse.length,
      rawResponsePreview: rawResponse.substring(0, 200),
    });

    return {
      success: false,
      error: `Unexpected parsing error: ${errorMsg}`,
    };
  }
}

/**
 * Validates that a raw response contains JSON
 * Useful for pre-flight checks
 */
export function containsJSON(text: string): boolean {
  if (!text || typeof text !== "string") {
    return false;
  }
  return extractJSON(text) !== null;
}

/**
 * Debug utility to inspect what was extracted from a response
 */
export function debugParseResponse(rawResponse: string): {
  extractedJSON: string | null;
  isValidJSON: boolean;
  parseResult: ParseLLMResult;
} {
  const extractedJSON = extractJSON(rawResponse);
  let isValidJSON = false;

  if (extractedJSON) {
    try {
      JSON.parse(extractedJSON);
      isValidJSON = true;
    } catch {
      isValidJSON = false;
    }
  }

  return {
    extractedJSON,
    isValidJSON,
    parseResult: parseLLMResponse(rawResponse),
  };
}
