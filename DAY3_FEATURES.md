# Day-3 Features Documentation

## Overview

MergeMind Day-3 features provide intelligent PR analysis through modular services that separate concerns and improve code maintainability.

## Architecture

The PR analysis flow follows a clean architecture pattern:

```
GitHub PR Data
    ↓
[PR Analyzer Service] → Orchestrates the analysis
    ↓
[Context Builder] → Structures PR data
    ↓
[File Classifier] → Categorizes files
    ↓
[PR Analysis Prompt] → Generates LLM prompt
    ↓
[OpenAI API] → Analyzes code
    ↓
Structured markdown report
```

## Modules

### 1. File Classifier (`src/utils/fileClassifier.ts`)

Categorizes files based on extension and generates language names.

**Functions:**

- `classifyFile(filename: string): FileType` - Categorizes files into 6 types
- `getLanguage(filename: string): string` - Determines programming language

**File Types:**

- `UI Component` (.tsx, .jsx)
- `Business Logic` (.ts, .js, .mts, .mjs)
- `API Layer` (.graphql, .gql)
- `Configuration` (.json, .yaml, .yml, .env, etc.)
- `Test File` (.test.ts, .spec.ts, etc.)
- `Other` (remaining files)

**Example:**

```typescript
import { classifyFile, getLanguage } from "@/app/utils/fileClassifier";

const type = classifyFile("Button.tsx"); // "UI Component"
const language = getLanguage("utils.ts"); // "TypeScript"
```

### 2. PR Context Builder (`src/services/contextBuilder.ts`)

Transforms GitHub PR data into structured context objects.

**Types:**

```typescript
interface PRFile {
  filename: string;
  language: string;
  additions: number;
  deletions: number;
  patch: string; // Max 2000 chars (trimmed)
  type: FileType;
}

interface PRContext {
  title: string;
  description: string;
  files: PRFile[];
}

interface PRStats {
  totalFiles: number;
  totalAdditions: number;
  totalDeletions: number;
  filesByType: Record<string, number>;
  filesByLanguage: Record<string, number>;
}
```

**Functions:**

- `buildPRContext(title, description, files)` - Creates PR context
- `generatePRStats(context)` - Calculates statistics
- `filterFilesByType(context, type)` - Filters files by category
- `getLargestFiles(context, limit)` - Returns top N files by changes

**Example:**

```typescript
import { buildPRContext, generatePRStats } from "@/app/services/contextBuilder";

const context = buildPRContext("Add feature X", "This PR adds...", gitHubFiles);

const stats = generatePRStats(context);
console.log(stats.totalAdditions); // 245
```

### 3. PR Analysis Prompt (`src/prompts/prAnalysisPrompt.ts`)

Generates structured prompts for LLM analysis and formats responses. Isin it the great thing?

**Functions:**

- `createPRPrompt(context: PRContext): string` - Generates analysis prompt
- `parseAnalysisResponse(response: string): AnalysisResult` - Parses LLM output
- `formatAnalysisMarkdown(result: AnalysisResult): string` - Formats as markdown

**Analysis Output Structure:**

```typescript
interface AnalysisResult {
  codeQualityIssues: string;
  potentialBugs: string;
  performanceConcerns: string;
  securityRisks: string;
  improvementSuggestions: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  riskExplanation: string;
}
```

**Example:**

```typescript
import { createPRPrompt, parseAnalysisResponse } from "@/app/prompts/prAnalysisPrompt";

const prompt = createPRPrompt(context);
const llmResponse = await openai.chat.create({ ... });
const analysis = parseAnalysisResponse(llmResponse);
```

### 4. PR Analyzer Service (`src/services/prAnalyzer.ts`)

Orchestrates the complete analysis flow: fetch → context → analyze → format

**Functions:**

- `analyzePullRequest(prIdentifier)` - Main analysis function
- `analyzePRFromData(prData)` - Analyze from raw data (testing)

**Supported Input Formats:**

```typescript
// Full URL
await analyzePullRequest("https://github.com/owner/repo/pull/123");

// owner/repo#number format
await analyzePullRequest("owner/repo#123");
```

**Output:**

```typescript
interface AnalysisOutput {
  analysis: string; // Formatted markdown report
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
}
```

**Example:**

```typescript
import { analyzePullRequest } from "@/app/services/prAnalyzer";

const result = await analyzePullRequest("facebook/react#20000");
console.log(result.analysis); // Full markdown report
console.log(result.riskLevel); // "MEDIUM"
```

## API Endpoints

### Analyze PR (V2)

**Endpoint:** `POST /api/analyze-pr/v2`

**Request Body Options:**

Option 1: PR number only (requires `GITHUB_REPO` env var)

```json
{
  "prNumber": 123
}
```

Option 2: Explicit owner/repo

```json
{
  "owner": "facebook",
  "repo": "react",
  "prNumber": 123
}
```

Option 3: Full URL

```json
{
  "url": "https://github.com/facebook/react/pull/123"
}
```

**Response:**

```json
{
  "analysis": "# PR Analysis Report\n## Code Quality Issues\n...",
  "riskLevel": "MEDIUM"
}
```

**Error Response:**

```json
{
  "error": "Pull request not found"
}
```

## Environment Variables

Required:

- `GITHUB_TOKEN` - GitHub personal access token for API access
- `OPENAI_API_KEY` - OpenAI API key for gpt-4o-mini model

Optional:

- `GITHUB_REPO` - Default repo in "owner/repo" format (for endpoint option 1)

## Testing

Run tests with Jest:

```bash
npm test tests/fileClassifier.test.ts
npm test tests/contextBuilder.test.ts
```

### Test Coverage

**fileClassifier.test.ts:**

- File type classification for all supported types
- Language detection from extensions
- Case insensitivity
- Edge cases (no extension, empty strings)

**contextBuilder.test.ts:**

- PR context building and structure validation
- File classification and language detection
- Patch trimming (max 2000 chars)
- Statistics generation (totals, by type, by language)
- Filtering and sorting operations

## Production Considerations

### Performance

- Patches are limited to 2000 characters per file to control token usage
- Supports up to ~150 files per PR (configurable via pagination)
- Uses gpt-4o-mini model for cost efficiency

### Error Handling

- Validates GitHub token and API access
- Handles network failures with descriptive errors
- Rate limiting awareness for GitHub and OpenAI APIs
- Proper error propagation through the stack

### Security

- No sensitive data logged to console in production
- GitHub tokens passed only through secure HTTPS
- Environment variables for all secrets

### Scalability

- Modular design allows easy feature additions
- Services are stateless and can be deployed independently
- Supports caching at context builder level if needed

## Example Workflow

```typescript
// 1. User provides PR URL/number
const prUrl = "https://github.com/facebook/react/pull/28000";

// 2. Analyzer fetches and processes
const result = await analyzePullRequest(prUrl);

// 3. Returns comprehensive analysis
console.log(result.analysis); // Markdown report
console.log(result.riskLevel); // Risk assessment

// Output example:
// # PR Analysis Report
//
// ## Code Quality Issues
// - Variable naming could be more descriptive in reducer.test.ts
// - Magic numbers should be extracted to constants
//
// ## Potential Bugs
// - Missing null check for props.data in component
//
// ## Risk Level: MEDIUM
// Changes to core logic warrant careful review
```

## Future Enhancements

- [ ] File diff visualization support
- [ ] Incremental analysis for large PRs
- [ ] Custom analysis templates
- [ ] Cross-file impact analysis
- [ ] Automated test suggestions
- [ ] Performance regression detection
- [ ] Security vulnerability scanning
- [ ] Dependency impact analysis
