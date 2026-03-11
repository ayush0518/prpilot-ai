import { PRContext } from "@/app/services/contextBuilder";

/**
 * Creates a structured prompt for PR analysis
 */
export function createPRPrompt(context: PRContext): string {
  const patches = context.files
    .map((file) => `File: ${file.filename}\n${file.patch}`)
    .join("\n\n---\n\n");

  const filesChanged = context.files
    .map((file) => `- ${file.filename} (${file.language}) - Additions: ${file.additions}, Deletions: ${file.deletions}`)
    .join("\n");

  const prompt = `You are MergeMind, an advanced AI code reviewer designed to analyze GitHub Pull Requests.

Your job is to analyze the provided pull request context and produce a structured machine-readable report that can be consumed by a frontend dashboard.

IMPORTANT RULES:

1. You MUST return ONLY valid JSON.
2. Do NOT include markdown formatting.
3. Do NOT include explanations outside JSON.
4. If a category has no issues, return an empty array.
5. Risk level must be one of: LOW, MEDIUM, HIGH.
6. The JSON structure MUST match the schema exactly.
7. Ensure the response is valid JSON that can be parsed directly.

---

OUTPUT JSON SCHEMA

Return an object with the following structure:

{
"prSummary": {
"title": "string",
"description": "string",
"overallRiskLevel": "LOW | MEDIUM | HIGH"
},
"codeQualityIssues": [
{
"file": "filename",
"issue": "description"
}
],
"potentialBugs": [
{
"file": "filename",
"bug": "description"
}
],
"performanceConcerns": [
{
"file": "filename",
"concern": "description"
}
],
"securityRisks": [
{
"file": "filename",
"risk": "description"
}
],
"improvementSuggestions": [
{
"file": "filename",
"suggestion": "description"
}
],
"suggestedTestCases": [
"test case developers should add"
],
"blastRadius": [],
"analysisSummary": "short human readable explanation of the PR impact"
}

---

GUIDELINES FOR ANALYSIS

When reviewing the pull request:

1. Review the changed files and code patches carefully.
2. Identify code quality issues such as readability problems, naming issues, duplication, or maintainability concerns.
3. Detect potential bugs including edge cases, missing error handling, or incorrect assumptions.
4. Identify performance issues such as unnecessary re-renders, redundant API calls, or inefficient loops.
5. Identify possible security risks such as unsanitized inputs or exposure of sensitive data.
6. Suggest improvements that would make the code more maintainable or robust.
7. Propose useful test cases developers should add to improve coverage.
8. Estimate the overall risk level of merging this PR.

---

RISK LEVEL CRITERIA

LOW

* Minor refactors
* UI changes
* documentation updates

MEDIUM

* logic changes
* API modifications
* moderate refactoring

HIGH

* authentication
* payment logic
* database logic
* security-sensitive areas

---

BLAST RADIUS RULE

For now return an empty array:

"blastRadius": []

This field will be used later by the MergeMind dependency engine.

---

SELF VALIDATION STEP

Before returning your response:

1. Verify the JSON structure matches the schema.
2. Ensure there are no markdown symbols.
3. Ensure the response is valid JSON.
4. Ensure every key exists.

---

PULL REQUEST CONTEXT

Title:
${context.title}

Description:
${context.description || "No description provided"}

Files Changed:
${filesChanged}

Code Patches:
${patches}

---

Return ONLY JSON.`;

  return prompt;
}

/**
 * Formats analysis output into a structured response
 */
export interface AnalysisResult {
  prSummary: {
    title: string;
    description: string;
    overallRiskLevel: "LOW" | "MEDIUM" | "HIGH";
  };
  codeQualityIssues: Array<{ file: string; issue: string }>;
  potentialBugs: Array<{ file: string; bug: string }>;
  performanceConcerns: Array<{ file: string; concern: string }>;
  securityRisks: Array<{ file: string; risk: string }>;
  improvementSuggestions: Array<{ file: string; suggestion: string }>;
  suggestedTestCases: string[];
  blastRadius: unknown[];
  analysisSummary: string;
}

/**
 * Parses LLM response into structured analysis
 */
export function parseAnalysisResponse(response: string): AnalysisResult {
  try {
    // Extract JSON from response (in case LLM includes extra text)
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate required fields
    if (
      !parsed.prSummary ||
      !parsed.codeQualityIssues ||
      !parsed.potentialBugs ||
      !parsed.performanceConcerns ||
      !parsed.securityRisks ||
      !parsed.improvementSuggestions ||
      !parsed.suggestedTestCases ||
      !parsed.analysisSummary
    ) {
      throw new Error("Missing required fields in JSON response");
    }

    return parsed as AnalysisResult;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to parse analysis response: ${errorMessage}`);
  }
}

/**
 * Formats analysis result as markdown
 */
export function formatAnalysisMarkdown(result: AnalysisResult): string {
  const formatIssues = (issues: Array<{ file: string; [key: string]: string }>) => {
    if (issues.length === 0) return "No significant concerns identified.";
    return issues.map((item) => `- **${item.file}**: ${Object.values(item).slice(1)[0]}`).join("\n");
  };

  return `# PR Analysis Report

## Summary
**Title:** ${result.prSummary.title}
**Description:** ${result.prSummary.description}

## Code Quality Issues
${formatIssues(result.codeQualityIssues)}

## Potential Bugs
${formatIssues(result.potentialBugs)}

## Performance Concerns
${formatIssues(result.performanceConcerns)}

## Security Risks
${formatIssues(result.securityRisks)}

## Improvement Suggestions
${formatIssues(result.improvementSuggestions)}

## Suggested Test Cases
${result.suggestedTestCases.length > 0 ? result.suggestedTestCases.map((tc) => `- ${tc}`).join("\n") : "No specific test cases suggested."}

## Analysis Summary
${result.analysisSummary}

## Risk Level: ${result.prSummary.overallRiskLevel}
`;
}
