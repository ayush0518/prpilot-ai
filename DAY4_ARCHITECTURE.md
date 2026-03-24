# MergeMind Day-4 Architecture Improvements

## Overview

This document outlines the production-grade architecture improvements implemented for stable PR analysis and deterministic risk scoring.

## What Was Fixed

### 1. **Non-JSON Output Problem**

**Before:** AI responses were inconsistent (sometimes markdown, sometimes text, sometimes JSON)
**After:** Strict JSON prompt + safe parser = guaranteed structured output

### 2. **Unsafe JSON Parsing**

**Before:** Single `JSON.parse()` with no error recovery
**After:** `parseLLMResponse()` extracts JSON from noise and validates schema

### 3. **Deterministic Risk Scoring**

**Before:** Risk level only from LLM's assertion
**After:** Computed risk engine validates and can override LLM scores

### 4. **No Type Safety**

**Before:** `any` types and loose structures
**After:** Strong TypeScript interfaces throughout

## Architecture

```
Input (PR URL)
    ↓
prAnalyzer.ts (orchestrator)
    ├── fetchPRDetails() → GitHub API
    ├── fetchPRFiles() → GitHub API
    ├── buildPRContext() → PRContext
    ├── analyzeWithOpenAI() →
    │   ├── createPRPrompt() with strict instructions
    │   ├── OpenAI API call (gpt-4o-mini)
    │   └── parseLLMResponse() safely parses JSON
    ├── enhanceAnalysisWithRiskScore() →
    │   └── riskEngine.ts calculates final risk
    └── determineFinalRiskLevel()
    ↓
PRAnalysisWithRiskScore (structured analysis)
    ↓
API Response (v2/route.ts)
    ↓
UI Component (PRAnalysisCard.tsx)
```

## New Files Created

### 1. `/app/types/prAnalysis.ts`

**Purpose:** Single source of truth for all type definitions
**Key Types:**

- `PRAnalysis` - Core LLM response structure
- `PRIssue` - Individual code issue
- `RiskLevel`, `IssueSeverity`, `IssueType` - Enums
- `PRAnalysisWithRiskScore` - Analysis with computed risk

**Why:** Prevents type mismatches across parser, risk engine, and UI

### 2. `/app/utils/parseLLMResponse.ts`

**Purpose:** Safe JSON extraction and parsing from LLM responses
**Key Functions:**

- `parseLLMResponse()` - Main parser with full validation
- `extractJSON()` - Finds JSON in noisy text
- `validateAnalysisStructure()` - Schema validation
- `debugParseResponse()` - Debug utility for troubleshooting

**Key Features:**

- Extracts JSON even if LLM includes preamble/postscript
- Validates against `PRAnalysis` schema
- Normalizes risk levels and severity
- Comprehensive error logging for debugging
- Returns `ParseLLMResult` with success/error info

**Example:**

```typescript
const result = parseLLMResponse(llmResponse);
if (!result.success) {
  console.error("Parse failed:", result.error);
  throw new Error(result.error);
}
const analysis = result.analysis; // Typed PRAnalysis
```

### 3. `/app/core/riskEngine.ts`

**Purpose:** Deterministic risk calculation and validation
**Key Functions:**

- `calculateRiskScore()` - Weighted risk calculation
- `enhanceAnalysisWithRiskScore()` - Adds computed risk to analysis
- `determineFinalRiskLevel()` - Selects higher of LLM vs computed risk

**Risk Calculation:**

```
finalRiskScore = (diffSizeRisk × 0.40) +
                 (issueCountRisk × 0.35) +
                 (issueSeverityRisk × 0.25)
```

**Factors:**

- **Diff Size:** < 100 lines = LOW, < 500 = MEDIUM, < 1000 = HIGH, > 1000 = CRITICAL
- **Issue Count:** 0-2 = LOW, 2-5 = MEDIUM, 5-10 = HIGH, > 10 = CRITICAL
- **Severity:** Weighted by HIGH (1.0), MEDIUM (0.4), LOW (0.1)

**Output:** `RiskScoreBreakdown` with:

- Individual factor scores (0-1)
- Final risk score (0-100)
- Human-readable rationale

### 4. `/app/components/PRAnalysisCard.tsx`

**Purpose:** React component for displaying PR analysis
**Features:**

- Risk level badge (color-coded)
- Risk breakdown visualization
- Issue list with categorization
- Severity indicators
- Improvement suggestions
- Confidence score progress bar
- Print functionality

**Usage:**

```typescript
<PRAnalysisCard
  analysis={analysisWithRisk}
  finalRiskLevel={finalLevel}
  isLoading={loading}
  onRetry={handleRetry}
/>
```

## Key Improvements

### 1. **Strict JSON Prompt** (`prAnalysisPrompt.ts`)

New prompt features:

- Explicit "JSON ONLY" instructions
- No markdown, code blocks, or explanations allowed
- Schema validation instructions
- Risk level criteria clearly defined
- Self-validation step for LLM

Example constraint:

```
"return ONLY the JSON object. No escape sequences. No extra text. Valid JSON only."
```

### 2. **Parser Safety**

Multiple layers of protection:

1. Extract JSON from potential noise
2. Parse with try-catch
3. Validate schema (all required fields)
4. Normalize values (enums)
5. Type-safe conversion

### 3. **Risk Engine Validation**

- Computes risk independently from LLM
- Validates LLM's risk level assertion
- Uses whichever is HIGHER for safety
- Provides detailed rationale

### 4. **Comprehensive Error Handling**

All endpoints return structured `AnalyzePRResponse`:

```typescript
{
  success: boolean;
  analysis?: PRAnalysisWithRiskScore;
  finalRiskLevel?: RiskLevel;
  error?: string;
  errorCode?: "NOT_FOUND" | "UNAUTHORIZED" | "PARSE_ERROR" | etc.
}
```

## Error Handling Coverage

### API Endpoint Errors (`/api/analyze-pr/v2`)

| Error                  | Status | Code              | Recovery                            |
| ---------------------- | ------ | ----------------- | ----------------------------------- |
| Missing request params | 400    | `INVALID_REQUEST` | Retry with correct format           |
| Missing env vars       | 500    | `MISSING_ENV`     | Configure env variables             |
| GitHub PR not found    | 404    | `NOT_FOUND`       | Check PR URL                        |
| Auth failed            | 401    | `UNAUTHORIZED`    | Check GITHUB_TOKEN & OPENAI_API_KEY |
| Rate limited           | 429    | `RATE_LIMITED`    | Retry after delay                   |
| JSON parse failed      | 500    | `PARSE_ERROR`     | Check LLM response                  |

### Parser Errors (`parseLLMResponse()`)

| Scenario                | Handling                                          |
| ----------------------- | ------------------------------------------------- |
| No JSON in response     | Return `{success: false, error: "No JSON found"}` |
| Invalid JSON syntax     | Catch parse error, return with error code         |
| Missing required fields | Fail schema validation                            |
| Invalid enum values     | Normalize to safe default                         |
| Unexpected error        | Log details, return generic error                 |

### OpenAI Errors (`analyzeWithOpenAI()`)

| Error          | Handling                       |
| -------------- | ------------------------------ |
| No API key     | Throw error with env var hint  |
| Empty response | Throw "No text content" error  |
| Parse failure  | Throw with parse error details |

## Type Safety

### Before

```typescript
// ❌ Unsafe
const analysis = response.data;
const risk = analysis.riskLevel; // any
if (risk === "HIGH") {
} // no validation
```

### After

```typescript
// ✅ Safe
const result = parseLLMResponse(response);
if (result.success) {
  const analysis: PRAnalysis = result.analysis;
  const risk: "LOW" | "MEDIUM" | "HIGH" = analysis.riskLevel;
  // Type-checked enums
}
```

## Breaking Changes

**NONE** - The old API endpoint `/api/analyze-pr` still works for backwards compatibility.
New functionality is in `/api/analyze-pr/v2`.

## Migration Path

### Old Code

```typescript
const result = await analyzePullRequest(prUrl);
console.log(result.analysis); // string
console.log(result.riskLevel); // "LOW" | "MEDIUM" | "HIGH"
```

### New Code

```typescript
const result = await analyzePullRequest(prUrl);
console.log(result.analysis.summary); // string
console.log(result.analysis.issues); // PRIssue[]
console.log(result.analysis.riskLevel); // LLM risk
console.log(result.analysis.computedRiskLevel); // Engine risk
console.log(result.finalRiskLevel); // Final (higher of two)
```

## Testing the Implementation

### 1. Test Type Safety

```bash
npx tsc --noEmit  # Check for type errors
```

### 2. Test Parser with Sample Response

```typescript
import {
  parseLLMResponse,
  debugParseResponse,
} from "@/app/utils/parseLLMResponse";

const sample = `{
  "summary": "...",
  "riskLevel": "HIGH",
  "issues": [],
  "improvements": [],
  "confidenceScore": 0.95
}`;

const result = parseLLMResponse(sample);
console.log(result.success); // true
```

### 3. Test Risk Engine

```typescript
import { calculateRiskScore } from "@/app/core/riskEngine";
import { PRAnalysis } from "@/app/types/prAnalysis";

const analysis: PRAnalysis = {
  summary: "...",
  riskLevel: "LOW",
  issues: [
    /* high severity bugs */
  ],
  improvements: [],
  confidenceScore: 0.9,
};

const breakdown = calculateRiskScore(analysis, prContext);
console.log(breakdown.finalRiskScore); // 0-100
```

### 4. Test API Endpoint

```bash
# Test with PR URL
curl -X POST http://localhost:3000/api/analyze-pr/v2 \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://github.com/owner/repo/pull/123"
  }'

# Test error handling
curl -X POST http://localhost:3000/api/analyze-pr/v2 \
  -H "Content-Type: application/json" \
  -d '{}' # Missing all required fields
```

### 5. Test UI Component

```typescript
import PRAnalysisCard from '@/app/components/PRAnalysisCard';

// Render with sample data
const mockAnalysis = {
  summary: "...",
  riskLevel: "HIGH",
  computedRiskLevel: "MEDIUM",
  issues: [
    {
      type: "bug",
      file: "src/api.ts",
      description: "Missing null check",
      severity: "HIGH",
      suggestion: "Add null check before accessing property"
    }
  ],
  improvements: ["Add logging"],
  confidenceScore: 0.92,
  riskScoreBreakdown: {
    diffSizeRisk: 0.5,
    issueCountRisk: 0.3,
    issueSeverityRisk: 0.8,
    finalRiskScore: 50,
    rationale: "..."
  }
};

<PRAnalysisCard analysis={mockAnalysis} finalRiskLevel="HIGH" />;
```

## Production Checklist

- [x] Strict JSON prompt defined
- [x] Safe JSON parser implemented
- [x] Risk engine calculates deterministically
- [x] Type definitions comprehensive
- [x] UI component displays analysis
- [x] Error handling covers all paths
- [x] API endpoint updated with new types
- [x] Backwards compatibility maintained
- [x] No `any` types used
- [x] Logging for debugging

## Performance Considerations

- **Parser:** O(n) where n = response length (finds JSON boundaries)
- **Risk Engine:** O(m) where m = number of issues (sums severity)
- **UI Component:** Renders incrementally with React

## Security Considerations

1. **JSON Injection Prevention:** Parser uses `JSON.parse()` safely
2. **No Dynamic Code Execution:** All enums are validated against whitelist
3. **Error Messages:** Sensitive info not exposed to client
4. **Environment Variables:** Never included in client response

## Future Improvements

1. **Caching:** Cache analyses for identical PRs
2. **Machine Learning:** Learn risk weights from historical data
3. **Custom Thresholds:** Allow per-repo risk configuration
4. **Webhooks:** Send analysis to external systems
5. **Dependency Analysis:** Track impact across repo
