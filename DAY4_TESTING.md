# Testing Guide - Day 4 Implementation

## Quick Start Testing

### 1. Type Checking

```bash
# Check for type errors
npx tsc --noEmit
```

Should show no errors if types are correct.

### 2. Parser Unit Test

Create `tests/parseLLMResponse.test.ts`:

```typescript
import {
  parseLLMResponse,
  debugParseResponse,
} from "@/app/utils/parseLLMResponse";

describe("parseLLMResponse", () => {
  it("should parse valid JSON", () => {
    const response = JSON.stringify({
      summary: "Test PR",
      riskLevel: "MEDIUM",
      issues: [],
      improvements: [],
      confidenceScore: 0.85,
    });

    const result = parseLLMResponse(response);
    expect(result.success).toBe(true);
    expect(result.analysis?.riskLevel).toBe("MEDIUM");
  });

  it("should extract JSON from noisy response", () => {
    const noisyResponse = `
      The analysis shows:
      {
        "summary": "Test",
        "riskLevel": "LOW",
        "issues": [],
        "improvements": [],
        "confidenceScore": 0.9
      }
      That's all folks!
    `;

    const result = parseLLMResponse(noisyResponse);
    expect(result.success).toBe(true);
  });

  it("should fail on missing required fields", () => {
    const incomplete = JSON.stringify({
      summary: "Test",
      riskLevel: "HIGH",
      // missing issues, improvements, confidenceScore
    });

    const result = parseLLMResponse(incomplete);
    expect(result.success).toBe(false);
    expect(result.error).toContain("structure");
  });

  it("should normalize risk levels", () => {
    const response = JSON.stringify({
      summary: "Test",
      riskLevel: "high", // lowercase
      issues: [],
      improvements: [],
      confidenceScore: 0.8,
    });

    const result = parseLLMResponse(response);
    expect(result.analysis?.riskLevel).toBe("HIGH");
  });
});
```

### 3. Risk Engine Unit Test

Create `tests/riskEngine.test.ts`:

```typescript
import {
  calculateRiskScore,
  enhanceAnalysisWithRiskScore,
} from "@/app/core/riskEngine";
import { PRAnalysis } from "@/app/types/prAnalysis";
import { buildPRContext } from "@/app/services/contextBuilder";

describe("riskEngine", () => {
  const mockContext = buildPRContext("Test PR", "Description", [
    {
      filename: "test.ts",
      additions: 100,
      deletions: 50,
      patch: "diff content",
      changes: 150,
    },
  ]);

  it("should calculate LOW risk for small diff", () => {
    const analysis: PRAnalysis = {
      summary: "Small change",
      riskLevel: "LOW",
      issues: [],
      improvements: [],
      confidenceScore: 0.9,
    };

    const breakdown = calculateRiskScore(analysis, mockContext);
    expect(breakdown.finalRiskScore).toBeLessThan(33);
  });

  it("should increase risk with issues", () => {
    const analysis: PRAnalysis = {
      summary: "PR with bugs",
      riskLevel: "LOW",
      issues: [
        {
          type: "bug",
          file: "test.ts",
          description: "Missing null check",
          severity: "HIGH",
          suggestion: "Add check",
        },
        {
          type: "security",
          file: "test.ts",
          description: "SQL injection",
          severity: "HIGH",
          suggestion: "Use parameterized query",
        },
      ],
      improvements: [],
      confidenceScore: 0.8,
    };

    const breakdown = calculateRiskScore(analysis, mockContext);
    expect(breakdown.issueCountRisk).toBeGreaterThan(0.3);
  });

  it("should provide rationale", () => {
    const analysis: PRAnalysis = {
      summary: "Test",
      riskLevel: "MEDIUM",
      issues: [
        {
          type: "performance",
          file: "api.ts",
          description: "N+1 query",
          severity: "MEDIUM",
          suggestion: "Batch queries",
        },
      ],
      improvements: [],
      confidenceScore: 0.92,
    };

    const breakdown = calculateRiskScore(analysis, mockContext);
    expect(breakdown.rationale).toContain("issue");
  });
});
```

### 4. API Integration Test

Create `tests/api.test.ts`:

```typescript
describe("POST /api/analyze-pr/v2", () => {
  it("should return structured response", async () => {
    const response = await fetch("http://localhost:3000/api/analyze-pr/v2", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: "https://github.com/vercel/next.js/pull/1", // Example PR
      }),
    });

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.analysis).toBeDefined();
    expect(data.analysis.summary).toBeTruthy();
    expect(data.analysis.issues).toBeInstanceOf(Array);
    expect(["LOW", "MEDIUM", "HIGH"]).toContain(data.finalRiskLevel);
  });

  it("should handle missing params", async () => {
    const response = await fetch("http://localhost:3000/api/analyze-pr/v2", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}), // No URL
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error).toBeTruthy();
  });

  it("should return 404 for invalid PR", async () => {
    const response = await fetch("http://localhost:3000/api/analyze-pr/v2", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: "https://github.com/invalid/invalid/pull/99999",
      }),
    });

    expect([404, 500]).toContain(response.status);
    const data = await response.json();
    expect(data.success).toBe(false);
  });
});
```

### 5. Component Test

Create `tests/PRAnalysisCard.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react';
import PRAnalysisCard from '@/app/components/PRAnalysisCard';
import { PRAnalysisWithRiskScore } from '@/app/types/prAnalysis';

describe('PRAnalysisCard', () => {
  const mockAnalysis: PRAnalysisWithRiskScore = {
    summary: "Added new authentication feature",
    riskLevel: "HIGH",
    issues: [
      {
        type: "security",
        file: "auth.ts",
        description: "Missing CSRF token validation",
        severity: "HIGH",
        suggestion: "Add CSRF middleware"
      }
    ],
    improvements: ["Add rate limiting"],
    confidenceScore: 0.92,
    computedRiskLevel: "MEDIUM",
    riskScoreBreakdown: {
      diffSizeRisk: 0.4,
      issueCountRisk: 0.3,
      issueSeverityRisk: 0.8,
      finalRiskScore: 50,
      rationale: "1 high severity security issue found"
    }
  };

  it('should render risk level badge', () => {
    render(
      <PRAnalysisCard
        analysis={mockAnalysis}
        finalRiskLevel="HIGH"
      />
    );

    expect(screen.getByText('HIGH RISK')).toBeInTheDocument();
  });

  it('should display summary', () => {
    render(
      <PRAnalysisCard
        analysis={mockAnalysis}
        finalRiskLevel="HIGH"
      />
    );

    expect(screen.getByText('Added new authentication feature')).toBeInTheDocument();
  });

  it('should list issues', () => {
    render(
      <PRAnalysisCard
        analysis={mockAnalysis}
        finalRiskLevel="HIGH"
      />
    );

    expect(screen.getByText('Missing CSRF token validation')).toBeInTheDocument();
    expect(screen.getByText('Add CSRF middleware')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    render(
      <PRAnalysisCard
        analysis={mockAnalysis}
        finalRiskLevel="HIGH"
        isLoading={true}
      />
    );

    expect(screen.getByText('Analyzing PR...')).toBeInTheDocument();
  });
});
```

## Manual Testing Workflow

### Step 1: Start Development Server

```bash
npm run dev
```

### Step 2: Test Parser Directly

```bash
# Create test file
cat > test-parser.mjs << 'EOF'
import { parseLLMResponse } from './app/utils/parseLLMResponse.ts';

const testResponse = `
  Based on my analysis:
  {
    "summary": "Fixed critical security vulnerability",
    "riskLevel": "HIGH",
    "issues": [
      {
        "type": "security",
        "file": "api/auth.ts",
        "description": "JWT validation missing",
        "severity": "HIGH",
        "suggestion": "Add verify middleware"
      }
    ],
    "improvements": ["Add input validation"],
    "confidenceScore": 0.95
  }
  The fix is important!
`;

const result = parseLLMResponse(testResponse);
console.log('Success:', result.success);
console.log('Analysis:', JSON.stringify(result.analysis, null, 2));
EOF
```

### Step 3: Call API Endpoint

```bash
# Analyze a real PR
curl -X POST http://localhost:3000/api/analyze-pr/v2 \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://github.com/vercel/next.js/pull/50000"
  }' | jq .
```

### Step 4: Check Response Structure

```bash
# Should get:
{
  "success": true,
  "analysis": {
    "summary": "...",
    "riskLevel": "LOW|MEDIUM|HIGH",
    "issues": [...],
    "improvements": [...],
    "confidenceScore": 0.xx,
    "computedRiskLevel": "LOW|MEDIUM|HIGH",
    "riskScoreBreakdown": {
      "diffSizeRisk": 0.x,
      "issueCountRisk": 0.x,
      "issueSeverityRisk": 0.x,
      "finalRiskScore": xx,
      "rationale": "..."
    }
  },
  "finalRiskLevel": "LOW|MEDIUM|HIGH"
}
```

### Step 5: Verify Type Safety

```bash
npx tsc --noEmit
```

Should produce **zero** errors.

## Debugging Solutions

### Issue: Parser returns `success: false`

Check:

1. Is JSON present in response? → `debugParseResponse()`
2. Are all required fields present?
3. Is `riskLevel` one of: LOW, MEDIUM, HIGH?
4. Is `confidenceScore` a number 0-1?

### Issue: Risk score differs from LLM

This is **expected behavior**!

- LLM provides semantic judgment
- Risk engine provides mathematical calculation
- Final uses the **higher** of the two for safety

### Issue: API returns 500 error

Check:

1. Is `GITHUB_TOKEN` set? `echo $GITHUB_TOKEN`
2. Is `OPENAI_API_KEY` set? `echo $OPENAI_API_KEY`
3. Check server logs for detailed error
4. Use `debugParseResponse()` to inspect LLM response

### Issue: Component not rendering

Check:

1. Are all required props provided?
2. Is analysis object complete?
3. Check browser console for React errors
4. Verify CSS is loaded (Tailwind)

## CI/CD Integration

Add to your GitHub Actions:

```yaml
- name: Type Check
  run: npx tsc --noEmit

- name: Run Tests
  run: npm test

- name: Lint
  run: npm run lint
```

## Performance Benchmarks

Track these metrics:

```typescript
// LLM Response Time
const start = Date.now();
const result = await analyzePullRequest(prUrl);
const duration = Date.now() - start;
console.log(`Analysis took ${duration}ms`);
```

Expected:

- Small PR: 3-5 seconds
- Medium PR: 5-8 seconds
- Large PR: 8-15 seconds

## Success Criteria

- [x] Parser handles noisy LLM responses
- [x] Risk engine calculates deterministically
- [x] API returns structured JSON with no errors
- [x] UI component renders all data correctly
- [x] Type checking passes with no errors
- [x] Error handling covers edge cases
- [x] All logs are meaningful for debugging
