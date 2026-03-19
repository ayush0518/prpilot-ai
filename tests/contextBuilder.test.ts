import {
  buildPRContext,
  generatePRStats,
  filterFilesByType,
  getLargestFiles,
  PRContext,
  PRFile,
} from "@/app/services/contextBuilder";

describe("contextBuilder", () => {
  const mockGitHubFiles = [
    {
      filename: "src/components/Button.tsx",
      additions: 50,
      deletions: 10,
      patch: "--- a/src/components/Button.tsx\n+++ b/src/components/Button.tsx\n@@ -1,3 +1,5 @@\n",
    },
    {
      filename: "src/utils/helpers.ts",
      additions: 30,
      deletions: 5,
      patch: "--- a/src/utils/helpers.ts\n+++ b/src/utils/helpers.ts\n",
    },
    {
      filename: "src/api/graphql.graphql",
      additions: 20,
      deletions: 2,
      patch: "--- a/src/api/graphql.graphql\n+++ b/src/api/graphql.graphql\n",
    },
    {
      filename: "tests/helpers.test.ts",
      additions: 40,
      deletions: 15,
      patch: "--- a/tests/helpers.test.ts\n+++ b/tests/helpers.test.ts\n",
    },
    {
      filename: "package.json",
      additions: 5,
      deletions: 0,
      patch: "--- a/package.json\n+++ b/package.json\n",
    },
  ];

  describe("buildPRContext", () => {
    it("should build PR context with correct structure", () => {
      const context = buildPRContext("Add new features", "This PR adds new features", mockGitHubFiles);

      expect(context).toHaveProperty("title");
      expect(context).toHaveProperty("description");
      expect(context).toHaveProperty("files");
      expect(context.title).toBe("Add new features");
      expect(context.description).toBe("This PR adds new features");
      expect(Array.isArray(context.files)).toBe(true);
    });

    it("should correctly classify files", () => {
      const context = buildPRContext("Test", "Test PR", mockGitHubFiles);

      const uiFile = context.files.find((f) => f.filename === "src/components/Button.tsx");
      expect(uiFile?.type).toBe("UI Component");

      const businessLogicFile = context.files.find((f) => f.filename === "src/utils/helpers.ts");
      expect(businessLogicFile?.type).toBe("Business Logic");

      const apiFile = context.files.find((f) => f.filename === "src/api/graphql.graphql");
      expect(apiFile?.type).toBe("API Layer");

      const testFile = context.files.find((f) => f.filename === "tests/helpers.test.ts");
      expect(testFile?.type).toBe("Test File");

      const configFile = context.files.find((f) => f.filename === "package.json");
      expect(configFile?.type).toBe("Configuration");
    });

    it("should derive correct language from filename", () => {
      const context = buildPRContext("Test", "Test PR", mockGitHubFiles);

      expect(context.files[0].language).toBe("TypeScript React");
      expect(context.files[1].language).toBe("TypeScript");
      expect(context.files[2].language).toBe("GraphQL");
      expect(context.files[3].language).toBe("TypeScript");
      expect(context.files[4].language).toBe("JSON");
    });

    it("should preserve additions and deletions count", () => {
      const context = buildPRContext("Test", "Test PR", mockGitHubFiles);

      expect(context.files[0].additions).toBe(50);
      expect(context.files[0].deletions).toBe(10);
      expect(context.files[1].additions).toBe(30);
      expect(context.files[1].deletions).toBe(5);
    });

    it("should trim patch to 2000 characters by default", () => {
      const longPatch = "x".repeat(3000);
      const fileWithLongPatch = [
        {
          filename: "test.ts",
          additions: 5,
          deletions: 0,
          patch: longPatch,
        },
      ];

      const context = buildPRContext("Test", "Test PR", fileWithLongPatch);

      expect(context.files[0].patch.length).toBeLessThanOrEqual(2015); // 2000 + " (truncated)"
      expect(context.files[0].patch).toContain("... (truncated)");
    });

    it("should handle missing patch gracefully", () => {
      const filesWithoutPatch = [
        {
          filename: "test.ts",
          additions: 5,
          deletions: 0,
        },
      ];

      const context = buildPRContext("Test", "Test PR", filesWithoutPatch);

      expect(context.files[0].patch).toBe("");
    });
  });

  describe("generatePRStats", () => {
    const context = buildPRContext("Test", "Test PR", mockGitHubFiles);

    it("should calculate correct totals", () => {
      const stats = generatePRStats(context);

      expect(stats.totalFiles).toBe(5);
      expect(stats.totalAdditions).toBe(145); // 50+30+20+40+5
      expect(stats.totalDeletions).toBe(32); // 10+5+2+15+0
    });

    it("should count files by type", () => {
      const stats = generatePRStats(context);

      expect(stats.filesByType["UI Component"]).toBe(1);
      expect(stats.filesByType["Business Logic"]).toBe(1);
      expect(stats.filesByType["API Layer"]).toBe(1);
      expect(stats.filesByType["Test File"]).toBe(1);
      expect(stats.filesByType["Configuration"]).toBe(1);
    });

    it("should count files by language", () => {
      const stats = generatePRStats(context);

      expect(stats.filesByLanguage["TypeScript React"]).toBe(1);
      expect(stats.filesByLanguage["TypeScript"]).toBe(2);
      expect(stats.filesByLanguage["GraphQL"]).toBe(1);
      expect(stats.filesByLanguage["JSON"]).toBe(1);
    });

    it("should handle empty file list", () => {
      const emptyContext: PRContext = {
        title: "Empty PR",
        description: "No files",
        files: [],
      };

      const stats = generatePRStats(emptyContext);

      expect(stats.totalFiles).toBe(0);
      expect(stats.totalAdditions).toBe(0);
      expect(stats.totalDeletions).toBe(0);
      expect(Object.keys(stats.filesByType).length).toBe(0);
      expect(Object.keys(stats.filesByLanguage).length).toBe(0);
    });
  });

  describe("filterFilesByType", () => {
    const context = buildPRContext("Test", "Test PR", mockGitHubFiles);

    it("should filter files by UI Component type", () => {
      const uiFiles = filterFilesByType(context, "UI Component");

      expect(uiFiles).toHaveLength(1);
      expect(uiFiles[0].filename).toBe("src/components/Button.tsx");
    });

    it("should filter files by Business Logic type", () => {
      const businessLogicFiles = filterFilesByType(context, "Business Logic");

      expect(businessLogicFiles).toHaveLength(1);
      expect(businessLogicFiles[0].filename).toBe("src/utils/helpers.ts");
    });

    it("should filter files by Test File type", () => {
      const testFiles = filterFilesByType(context, "Test File");

      expect(testFiles).toHaveLength(1);
      expect(testFiles[0].filename).toBe("tests/helpers.test.ts");
    });

    it("should return empty array for non-existent type", () => {
      const otherFiles = filterFilesByType(context, "Other");

      expect(otherFiles).toHaveLength(0);
    });
  });

  describe("getLargestFiles", () => {
    const context = buildPRContext("Test", "Test PR", mockGitHubFiles);

    it("should return top 5 files by changes by default", () => {
      const largestFiles = getLargestFiles(context);

      expect(largestFiles).toHaveLength(5);
      // First file should have 50+10=60 total changes (Button.tsx)
      expect(largestFiles[0].filename).toBe("src/components/Button.tsx");
    });

    it("should respect limit parameter", () => {
      const topTwo = getLargestFiles(context, 2);

      expect(topTwo).toHaveLength(2);
      expect(topTwo[0].additions + topTwo[0].deletions).toBeGreaterThanOrEqual(
        topTwo[1].additions + topTwo[1].deletions
      );
    });

    it("should sort by total changes descending", () => {
      const sorted = getLargestFiles(context);

      for (let i = 0; i < sorted.length - 1; i++) {
        const current = sorted[i].additions + sorted[i].deletions;
        const next = sorted[i + 1].additions + sorted[i + 1].deletions;
        expect(current).toBeGreaterThanOrEqual(next);
      }
    });

    it("should return empty array for empty context", () => {
      const emptyContext: PRContext = {
        title: "Empty",
        description: "",
        files: [],
      };

      const largest = getLargestFiles(emptyContext, 5);

      expect(largest).toHaveLength(0);
    });
  });
});
