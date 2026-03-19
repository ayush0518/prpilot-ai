/**
 * Validation tests for Merge Readiness Engine V2
 * These scenarios verify balanced decision logic
 */

import { computeMergeReadiness, MergeReadinessInput } from "../app/core/mergeReadinessEngine";

// Test scenarios with expected outcomes
const scenarios: Array<{
  name: string;
  input: MergeReadinessInput;
  expectedStatus: "SAFE" | "CAUTION" | "BLOCK";
  reason: string;
}> = [
  {
    name: "Case 1: HIGH risk + MEDIUM compliance + impact 37",
    input: {
      finalRiskLevel: "HIGH",
      complianceRisk: "MEDIUM",
      impactScore: 37,
      confidenceScore: 0.75,
    },
    expectedStatus: "CAUTION",
    reason: "Should be CAUTION (Rule 3: MEDIUM compliance + impact > 35)",
  },
  {
    name: "Case 2: HIGH risk + HIGH compliance + impact 70",
    input: {
      finalRiskLevel: "HIGH",
      complianceRisk: "HIGH",
      impactScore: 70,
      confidenceScore: 0.8,
    },
    expectedStatus: "BLOCK",
    reason: "Should be BLOCK (Rule 1: compliance=HIGH triggers hard block)",
  },
  {
    name: "Case 3: LOW risk + LOW compliance + impact 20",
    input: {
      finalRiskLevel: "LOW",
      complianceRisk: "LOW",
      impactScore: 20,
      confidenceScore: 0.9,
    },
    expectedStatus: "SAFE",
    reason: "Should be SAFE (no risks, low impact, high confidence)",
  },
  {
    name: "Case 4a: MEDIUM risk + HIGH impact",
    input: {
      finalRiskLevel: "MEDIUM",
      complianceRisk: "LOW",
      impactScore: 70,
      confidenceScore: 0.85,
    },
    expectedStatus: "CAUTION",
    reason: "Should be CAUTION (impact > 65 triggers Rule 3 or score > 45)",
  },
  {
    name: "Case 4b: MEDIUM risk + HIGH compliance",
    input: {
      finalRiskLevel: "MEDIUM",
      complianceRisk: "MEDIUM",
      impactScore: 50,
      confidenceScore: 0.75,
    },
    expectedStatus: "CAUTION",
    reason: "Should be CAUTION (Rule 3: compliance=MEDIUM or impact > 35)",
  },
  {
    name: "Case 5: HIGH risk + LOW impact (edge case - don't over-block)",
    input: {
      finalRiskLevel: "HIGH",
      complianceRisk: "LOW",
      impactScore: 30,
      confidenceScore: 0.7,
    },
    expectedStatus: "CAUTION",
    reason: "Should be CAUTION (Rule 2: HIGH risk but LOW impact)",
  },
  {
    name: "Case 6: HIGH risk + LOW compliance + low impact",
    input: {
      finalRiskLevel: "HIGH",
      complianceRisk: "LOW",
      impactScore: 40,
      confidenceScore: 0.9,
    },
    expectedStatus: "CAUTION",
    reason: "Should be CAUTION (Rule 3: impact > 35)",
  },
  {
    name: "Case 7: All LOW signals",
    input: {
      finalRiskLevel: "LOW",
      complianceRisk: "LOW",
      impactScore: 5,
      confidenceScore: 0.95,
    },
    expectedStatus: "SAFE",
    reason: "Should be SAFE (all signals minimal)",
  },
  {
    name: "Case 8: LOW confidence amplifies caution",
    input: {
      finalRiskLevel: "MEDIUM",
      complianceRisk: "LOW",
      impactScore: 20,
      confidenceScore: 0.5,
    },
    expectedStatus: "CAUTION",
    reason: "Should be CAUTION (low confidence + score amplification)",
  },
];

/**
 * Run validation tests
 */
export function runValidation(): void {
  console.log("\n========================================");
  console.log("MERGE READINESS ENGINE V2 - VALIDATION");
  console.log("========================================\n");

  let passed = 0;
  let failed = 0;

  scenarios.forEach((scenario) => {
    const result = computeMergeReadiness(scenario.input);
    const isCorrect = result.status === scenario.expectedStatus;

    const status = isCorrect ? "✅ PASS" : "❌ FAIL";
    console.log(`${status} - ${scenario.name}`);
    console.log(`     Expected: ${scenario.expectedStatus} | Got: ${result.status}`);
    console.log(`     Score: ${result.score}/100`);
    console.log(`     Reason: ${result.reason}`);
    console.log(`     Notes: ${scenario.reason}\n`);

    if (isCorrect) {
      passed++;
    } else {
      failed++;
    }
  });

  console.log("========================================");
  console.log(`Results: ${passed}/${scenarios.length} passed`);
  if (failed > 0) {
    console.log(`⚠️  ${failed} scenarios failed!`);
  } else {
    console.log("✅ All validation scenarios passed!");
  }
  console.log("========================================\n");
}

/**
 * Quick diagnostic: log decision rules evaluation
 */
export function diagnosticRuleEvaluation(input: MergeReadinessInput): void {
  const result = computeMergeReadiness(input);
  console.log("\n--- Diagnostic Evaluation ---");
  console.log("Input:", input);
  console.log("Output:", result);
  console.log("--- End Diagnostic ---\n");
}
