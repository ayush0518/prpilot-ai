# Quick Start Guide - MergeMind Day-3 Features

## Setup

### 1. Install Dependencies

```bash
npm install
```

This adds Jest and ts-jest for running tests.

### 2. Configure Environment Variables

Create or update `.env.local`:

```bash
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxx
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxx
GITHUB_REPO=facebook/react  # Optional - used in API format 1
```

### 3. Install New Dependencies

```bash
npm install
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test tests/fileClassifier.test.ts
npm test tests/contextBuilder.test.ts
```

### Example Test Output

```
PASS  tests/fileClassifier.test.ts (2.3s)
  fileClassifier
    classifyFile
      ✓ should classify .tsx files as UI Component (1ms)
      ✓ should classify .jsx files as UI Component (0ms)
      ✓ should classify test files as Test File (0ms)
      ...
    getLanguage
      ✓ should map TypeScript extensions (0ms)
      ✓ should map JavaScript extensions (0ms)
      ...

PASS  tests/contextBuilder.test.ts (1.8s)
  contextBuilder
    buildPRContext
      ✓ should build PR context with correct structure (1ms)
      ✓ should correctly classify files (0ms)
      ...
```

## Using the Analyzer Service

### Direct Usage (TypeScript)

```typescript
import { analyzePullRequest } from "@/app/services/prAnalyzer";

// Analyze a PR from GitHub
async function analyzeReactPR() {
  try {
    const result = await analyzePullRequest("facebook/react#28000");

    console.log("Analysis Report:");
    console.log(result.analysis);
    console.log("\nRisk Level:", result.riskLevel);
  } catch (error) {
    console.error("Analysis failed:", error);
  }
}
```

### Using the API Endpoint

#### Option 1: PR Number Only

Requires `GITHUB_REPO` environment variable

```bash
curl -X POST http://localhost:3000/api/analyze-pr/v2 \
  -H "Content-Type: application/json" \
  -d '{"prNumber": 28000}'
```

#### Option 2: Explicit Owner/Repo

```bash
curl -X POST http://localhost:3000/api/analyze-pr/v2 \
  -H "Content-Type: application/json" \
  -d '{
    "owner": "facebook",
    "repo": "react",
    "prNumber": 28000
  }'
```

#### Option 3: Full URL

```bash
curl -X POST http://localhost:3000/api/analyze-pr/v2 \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://github.com/facebook/react/pull/28000"
  }'
```

### Response Format

```json
{
  "analysis": "# PR Analysis Report\n\n## Code Quality Issues\n...",
  "riskLevel": "MEDIUM"
}
```

## Exploring the Modules

### File Classifier

```typescript
import { classifyFile, getLanguage } from "@/app/utils/fileClassifier";

// Classify a file
console.log(classifyFile("Button.tsx")); // "UI Component"
console.log(classifyFile("utils.test.ts")); // "Test File"
console.log(classifyFile("package.json")); // "Configuration"

// Get language
console.log(getLanguage("app.ts")); // "TypeScript"
console.log(getLanguage("style.scss")); // "SCSS"
```

### PR Context Builder

```typescript
import { buildPRContext, generatePRStats } from "@/app/services/contextBuilder";

// Build context from GitHub files
const context = buildPRContext(
  "Add new features",
  "This PR adds new features",
  [
    {
      filename: "src/Button.tsx",
      additions: 50,
      deletions: 10,
      patch: "--- a/src/Button.tsx\n...",
    },
    // ... more files
  ],
);

// Generate statistics
const stats = generatePRStats(context);
console.log(stats.totalAdditions); // 245
console.log(stats.filesByType); // { "UI Component": 5, ... }
console.log(stats.filesByLanguage); // { "TypeScript": 8, ... }
```

### PR Analysis Prompt

```typescript
import {
  createPRPrompt,
  parseAnalysisResponse,
} from "@/app/prompts/prAnalysisPrompt";

// Generate prompt for LLM
const prompt = createPRPrompt(context);
console.log(prompt); // Full analysis instruction

// Parse LLM response
const analysis = parseAnalysisResponse(llmResponse);
console.log(analysis.riskLevel); // "HIGH"
console.log(analysis.codeQualityIssues); // "..."
```

## Troubleshooting

### Error: GITHUB_TOKEN not set

**Solution:** Set `GITHUB_TOKEN` in `.env.local`

```bash
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxx
```

### Error: OPENAI_API_KEY not set

**Solution:** Set `OPENAI_API_KEY` in `.env.local`

```bash
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxx
```

### Error: PR not found (404)

**Possible causes:**

- PR number doesn't exist
- Repository name is wrong
- PR is from private repo and token doesn't have access

**Solution:** Verify:

```bash
# Check token has correct scopes
curl -H "Authorization: token YOUR_TOKEN" https://api.github.com/user

# Verify repo exists and PR is accessible
curl -H "Authorization: token YOUR_TOKEN" \
  https://api.github.com/repos/OWNER/REPO/pulls/PR_NUMBER
```

### Tests not running

**Problem:** Jest not installed

```bash
npm install
```

### Port 3000 already in use

**Solution:** Use different port

```bash
PORT=3001 npm run dev
```

## API Response Examples

### Successful Analysis

```json
{
  "analysis": "# PR Analysis Report\n\n## Code Quality Issues\n- Inconsistent variable naming in component files\n- Missing JSDoc comments for exported functions\n\n## Potential Bugs\n- No validation on user input fields\n- Missing error boundary in ErrorScreen component\n\n## Performance Concerns\n- Unnecessary re-renders due to missing React.memo\n- Large bundle size due to unoptimized images\n\n## Security Risks\n- SQL injection vulnerability in database query\n- Missing CSRF token validation on forms\n\n## Improvement Suggestions\n- Extract magic numbers to constants\n- Add unit tests for utility functions\n- Use TypeScript for better type safety\n\n## Risk Level: MEDIUM\nWhile the code quality issues are minor, the potential bugs and security risks warrant careful review before merging.",
  "riskLevel": "MEDIUM"
}
```

### Error Response

```json
{
  "error": "Pull request not found"
}
```

## Development Workflow

### 1. Make Changes to Services

```typescript
// Edit src/services/contextBuilder.ts or other services
// Changes are automatically type-checked
```

### 2. Run Tests

```bash
npm test
```

### 3. Start Development Server

```bash
npm run dev
```

### 4. Test Endpoint

```bash
curl -X POST http://localhost:3000/api/analyze-pr/v2 \
  -H "Content-Type: application/json" \
  -d '{"owner": "facebook", "repo": "react", "prNumber": 28000}'
```

## Performance Tips

### Caching Analysis Results

If analyzing the same PR multiple times, consider caching:

```typescript
const cache = new Map<string, AnalysisOutput>();

async function analyzePRWithCache(prId: string) {
  if (cache.has(prId)) {
    return cache.get(prId)!;
  }

  const result = await analyzePullRequest(prId);
  cache.set(prId, result);
  return result;
}
```

### Token Optimization

The current implementation uses ~5000 tokens per PR analysis. To reduce costs:

- Filter out test files before analysis
- Increase patch truncation limit (currently 2000 chars)
- Analyze only specific file types

## Next Steps

1. Read [DAY3_FEATURES.md](DAY3_FEATURES.md) for comprehensive documentation
2. Read [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) for architecture details
3. Explore module code in `src/services/`, `src/utils/`, `src/prompts/`
4. Try the API endpoint with your own GitHub repository
5. Add custom analysis rules if needed

## Support

For issues or questions:

1. Check error messages in the error response
2. Review environment variables setup
3. Verify GitHub token has `repo` scope
4. Check OpenAI API key is valid and has available credits
