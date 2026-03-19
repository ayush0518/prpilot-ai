# Merge Readiness V2 - Integration Guide

## Overview

The Merge Readiness V2 engine is a **deterministic, rule-based decision system** that combines multiple PR signals into a single merge decision.

**Status**: ✅ Complete and integrated

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   PR Analysis Pipeline                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  prAnalyzer.analyzePullRequest()                           │
│  ├─ LLM Analysis → analysis.riskLevel (string)             │
│  ├─ computeBlastRadius() → blastRadius.impactScore (0-100) │
│  ├─ analyzeCompliance() → compliance.riskLevel (enum)      │
│  ├─ analysis.confidenceScore (0-1)                         │
│  │                                                          │
│  └─ determineFinalRiskLevel() → finalRiskLevel (enum)      │
│     └─ Converts analysis.riskLevel to canonical form       │
│                                                              │
│  ✨ NEW: computeMergeReadiness()                           │
│     ├─ Input: All 4 signals                                │
│     ├─ Apply weighted formula + decision rules             │
│     └─ Output: { status, score, reason }                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Input Signals

The engine receives:

| Signal            | Type   | Range                 | Source                                   |
| ----------------- | ------ | --------------------- | ---------------------------------------- |
| `finalRiskLevel`  | enum   | LOW \| MEDIUM \| HIGH | `riskEngine.determineFinalRiskLevel()`   |
| `complianceRisk`  | enum   | LOW \| MEDIUM \| HIGH | `complianceEngine.analyzeCompliance()`   |
| `impactScore`     | number | 0-100                 | `blastRadiusEngine.computeBlastRadius()` |
| `confidenceScore` | number | 0-1                   | LLM analysis output                      |

---

## Decision Process

### Step 1: Calculate Score (0-100)

```typescript
// Normalize all signals
const llmRisk = RISK_WEIGHT[finalRiskLevel] / 3; // 0-1
const complianceWeighted = RISK_WEIGHT[complianceRisk] / 3; // 0-1
const impactFactor = impactScore / 100; // 0-1

// Apply weighted formula
finalScore =
  (llmRisk * 0.4 + // LLM risk: 40% weight
    compliance * 0.3 + // Compliance: 30% weight
    impact * 0.3) * // Blast radius: 30% weight
  100;

// Adjust for confidence
finalScore *=
  confidence < 0.6
    ? 1.1 // Low confidence = more caution
    : confidence > 0.85
      ? 0.9 // High confidence = less caution
      : 1; // Medium = neutral

// Clamp to 0-100
finalScore = Math.max(0, Math.min(100, finalScore));
```

### Step 2: Apply Decision Rules

Rules are checked **in order** and stop at first match:

| #   | Condition                                                      | Decision                 | Rationale                         |
| --- | -------------------------------------------------------------- | ------------------------ | --------------------------------- |
| 1   | `compliance === "HIGH"` OR (`risk === "HIGH"` AND impact > 65) | **BLOCK**                | Hard blockers - real danger       |
| 2   | `risk === "HIGH"` AND impact ≤ 40 AND `compliance !== "HIGH"`  | **CAUTION**              | Don't over-block isolated changes |
| 3   | `compliance === "MEDIUM"` OR impact > 35 OR score > 45         | **CAUTION**              | Medium-level concern              |
| 4   | (no rule applies)                                              | Score-based (see Step 3) | Fallback to thresholds            |

### Step 3: Score-Based Fallback

If no rule applies:

```
if score >= 70 → BLOCK
if score >= 40 → CAUTION
else → SAFE
```

### Step 4: Generate Reason

Builds dynamic explanation from active factors:

- `finalRiskLevel === "HIGH"` → "high-risk change detected"
- `complianceRisk !== "LOW"` → "sensitive logic modified"
- `impactScore > 65` → "wide system impact"
- `impactScore > 35` → "moderate system impact"
- `confidenceScore < 0.6` → "low confidence in analysis"

---

## Key Design Decisions

### ✅ Rule 1: Hard Blocker

**Why**: HIGH compliance or HIGH risk + HIGH impact = genuine danger zones

### ✅ Rule 2: Smart Isolation

**Why**: HIGH risk changes that only affect 40% of codebase shouldn't be over-blocked

- Example: "Fixed critical bug in rarely-used utility" → CAUTION (not BLOCK)

### ✅ Rule 3: Medium Sensitivity

**Why**: Medium compliance + moderate impact compounds to concern

- Catches nuanced scenarios that score alone might miss

### ✅ Confidence Adjustment

**Why**:

- Low confidence (< 0.6) increases score by 10% → higher caution
- High confidence (> 0.85) decreases score by 10% → lower risk
- Reflects analysis uncertainty

---

## Test Scenarios Validated

✅ **Case 1**: HIGH risk + MEDIUM compliance + impact 37 → **CAUTION**

- Rule 3 triggered (compliance=MEDIUM)

✅ **Case 2**: HIGH risk + HIGH compliance + impact 70 → **BLOCK**

- Rule 1 triggered (compliance=HIGH)

✅ **Case 3**: LOW risk + LOW compliance + impact 20 → **SAFE**

- No rules, score < 40

✅ **Case 4a**: MEDIUM risk + HIGH impact → **CAUTION**

- Rule 3 triggered (impact > 35)

✅ **Case 5**: HIGH risk + LOW impact (KEY EDGE CASE) → **CAUTION**

- Rule 2 prevents over-blocking (impact ≤ 40)

---

## Integration Points

### In `prAnalyzer.ts`

```typescript
// After computing all signals...
const mergeReadiness = computeMergeReadiness({
  finalRiskLevel, // From riskEngine
  complianceRisk: compliance.riskLevel, // From complianceEngine
  impactScore: blastRadius.impactScore, // From blastRadiusEngine
  confidenceScore: analysis.confidenceScore, // From LLM
});

// Include in response
return {
  analysis,
  finalRiskLevel,
  blastRadius,
  compliance,
  mergeReadiness, // ← Single decision source
};
```

### In API Response (`/api/analyze-pr/v2`)

```json
{
  "success": true,
  "finalRiskLevel": "HIGH",
  "blastRadius": { "impactScore": 37, ... },
  "compliance": { "riskLevel": "MEDIUM", ... },
  "mergeReadiness": {
    "status": "CAUTION",
    "score": 56,
    "reason": "high-risk change detected, sensitive logic modified, moderate system impact"
  }
}
```

### In UI Components

```typescript
// Use status for decision display
const color = getStatusColor(mergeReadiness.status);
const emoji = getStatusEmoji(mergeReadiness.status);

// Use score for progress bar
<div style={{ width: `${mergeReadiness.score}%` }}>
  {mergeReadiness.score}
</div>

// Use reason for explanation
<p>{mergeReadiness.reason}</p>
```

---

## Decision Matrix

| **Risk × Compliance × Impact** | **Outcome** | **Rule**                         |
| ------------------------------ | ----------- | -------------------------------- |
| LOW × LOW × LOW                | SAFE        | Score < 40                       |
| LOW × LOW × HIGH               | CAUTION     | Rule 3 (impact > 35)             |
| HIGH × LOW × LOW               | CAUTION     | Rule 2 (high risk, low impact)   |
| HIGH × LOW × HIGH              | BLOCK       | Rule 1 (risk HIGH + impact > 65) |
| HIGH × MEDIUM × ANY            | CAUTION     | Rule 3 (compliance=MEDIUM)       |
| HIGH × HIGH × ANY              | BLOCK       | Rule 1 (compliance=HIGH)         |
| MEDIUM × MEDIUM × ANY          | CAUTION     | Rule 3 (compliance=MEDIUM)       |

---

## File References

| File                                                                  | Purpose                    |
| --------------------------------------------------------------------- | -------------------------- |
| [app/core/mergeReadinessEngine.ts](app/core/mergeReadinessEngine.ts)  | Main engine implementation |
| [app/services/prAnalyzer.ts](app/services/prAnalyzer.ts#L224)         | Integration point 1        |
| [app/services/prAnalyzer.ts](app/services/prAnalyzer.ts#L269)         | Integration point 2        |
| [app/api/analyze-pr/v2/route.ts](app/api/analyze-pr/v2/route.ts#L105) | API response assembly      |
| [app/types/prAnalysis.ts](app/types/prAnalysis.ts)                    | Type definitions           |

---

## API Usage Example

### Request

```bash
curl -X POST http://localhost:3000/api/analyze-pr/v2 \
  -H "Content-Type: application/json" \
  -d '{"prNumber": 123, "owner": "user", "repo": "repo"}'
```

### Response

```json
{
  "success": true,
  "finalRiskLevel": "HIGH",
  "mergeReadiness": {
    "status": "CAUTION",
    "score": 56,
    "reason": "high-risk change detected, sensitive logic modified, moderate system impact"
  }
}
```

---

## Success Criteria ✅

- [x] Evaluates ALL signals together (not siloed decisions)
- [x] Handles mixed scenarios (HIGH risk + LOW impact)
- [x] Produces single final decision
- [x] Avoids over-blocking
- [x] Uses combined weighted + rule-based logic
- [x] Deterministic (no LLM in decision engine)
- [x] Always explainable (includes reason)
- [x] Works across all signal combinations
