import { PRContext } from "@/app/services/contextBuilder";

/**
 * Creates a strict JSON prompt for PR analysis
 * Enforces JSON-only output with no markdown or explanations
 */
export function createPRPrompt(context: PRContext): string {
  const patches = context.files
    .map((file) => `File: ${file.filename}\n${file.patch}`)
    .join("\n\n---\n\n");

  const filesChanged = context.files
    .map((file) => `- ${file.filename} (${file.language}) - Additions: ${file.additions}, Deletions: ${file.deletions}`)
    .join("\n");

  const filesCount = context.files.length;
  const totalAdditions = context.files.reduce((sum, f) => sum + f.additions, 0);
  const totalDeletions = context.files.reduce((sum, f) => sum + f.deletions, 0);

  const prompt = `You are MergeMind, an advanced AI code reviewer for pull requests.

CRITICAL INSTRUCTIONS:
1. Return ONLY valid JSON - nothing else
2. NO markdown formatting whatsoever
3. NO explanations or text outside JSON
4. NO code blocks or backticks
5. NO comments in JSON
6. If parsing fails, the entire analysis fails

---

REQUIRED JSON SCHEMA (return this structure exactly):

{
  "summary": "2-3 sentence overview of what this PR does and its main impact",
  "riskLevel": "LOW or MEDIUM or HIGH",
  "issues": [
    {
      "type": "bug or security or performance or maintainability",
      "file": "filename",
      "description": "specific issue description",
      "severity": "LOW or MEDIUM or HIGH",
      "suggestion": "how to fix this issue"
    }
  ],
  "improvements": [
    "suggestion 1",
    "suggestion 2"
  ],
  "signalStrength": 0.95
}

---

CONSTRAINTS:
- "summary" must be 1-3 sentences, max 200 chars
- "riskLevel" must be exactly: LOW, MEDIUM, or HIGH
- "issues" should include all significant problems (empty array if none)
- Each issue must have ALL five fields: type, file, description, severity, suggestion
- "type" must be one of: bug, security, performance, maintainability
- "severity" must be one of: LOW, MEDIUM, HIGH
- "improvements" should list 0-5 actionable suggestions
- "signalStrength" must be a number between 0 and 1

---

ANALYSIS GUIDELINES:

1. BUGS: Missing null checks, edge cases, incorrect logic, race conditions
2. SECURITY: Injection vulnerabilities, authentication issues, data exposure
3. PERFORMANCE: Unnecessary re-renders, N+1 queries, memory leaks, inefficient algorithms
4. MAINTAINABILITY: Unclear code, poor naming, violations of conventions, tech debt

---

RISK LEVEL GUIDANCE:

LOW RISK:
- Documentation/comment updates
- Minor UI tweaks
- Style changes
- Type corrections
- < 50 lines changed

MEDIUM RISK:
- Logic changes to non-critical features
- API modifications
- New utility functions
- Database schema non-breaking changes
- 50-500 lines changed

HIGH RISK:
- Authentication/authorization changes
- Payment or billing logic
- Database migrations
- Core business logic
- Security-sensitive code
- > 500 lines changed in critical paths

---

PULL REQUEST CONTEXT:

Title: ${context.title}

Description: ${context.description || "No description provided"}

Statistics:
- Files changed: ${filesCount}
- Additions: ${totalAdditions}
- Deletions: ${totalDeletions}

Files Changed:
${filesChanged}

Code Diffs:
${patches}

---

FINAL REMINDER: Output ONLY the JSON object. No escape sequences. No extra text. Valid JSON only.`;

  return prompt;
}

/**
 * New parsers and utilities (deprecated - now use parseLLMResponse from utils)
 * Kept for backwards compatibility only
 */

// Legacy type for backwards compatibility
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
 * Formats analysis result as markdown
 * Deprecated: use formatAnalysisMarkdown for display
 */
export function formatAnalysisMarkdown(result: { prSummary: { title: string; description: string; overallRiskLevel: string }; codeQualityIssues: Array<{ file: string; issue: string }>; potentialBugs: Array<{ file: string; bug: string }>; performanceConcerns: Array<{ file: string; concern: string }>; securityRisks: Array<{ file: string; risk: string }>; improvementSuggestions: Array<{ file: string; suggestion: string }>; suggestedTestCases: string[]; analysisSummary: string }): string {
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
