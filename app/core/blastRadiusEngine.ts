/**
 * Blast Radius Engine
 * Determines which architectural layers of the system are affected by a PR
 * based on changed file paths.
 */

export interface BlastRadius {
  affectedLayers: string[];
  layerCounts: Record<string, number>;
  impactScore: number;
  explanation: string;
}

/**
 * Architectural layer types
 */
type ArchitecturalLayer =
  | "API"
  | "Service"
  | "Utility"
  | "Middleware"
  | "Config"
  | "Test"
  | "Documentation"
  | "Other";

/**
 * Classifies a file into an architectural layer based on its path
 */
function classifyFileLayer(filePath: string): ArchitecturalLayer {
  const lowerPath = filePath.toLowerCase();

  // API layer
  if (lowerPath.includes("/api/")) {
    return "API";
  }

  // Service layer
  if (lowerPath.includes("/services/")) {
    return "Service";
  }

  // Utility layer
  if (lowerPath.includes("/utils/")) {
    return "Utility";
  }

  // Middleware layer
  if (lowerPath.includes("/middleware/")) {
    return "Middleware";
  }

  // Config files
  if (
    lowerPath.includes("config") ||
    lowerPath.includes("tsconfig") ||
    lowerPath.includes(".env")
  ) {
    return "Config";
  }

  // Test files
  if (
    lowerPath.includes("test") ||
    lowerPath.includes("__tests__") ||
    lowerPath.includes(".spec.") ||
    lowerPath.includes(".test.")
  ) {
    return "Test";
  }

  // Documentation
  if (isDocumentation(filePath)) {
    return "Documentation";
  }

  // Default to Other
  return "Other";
}

/**
 * Checks if a file is documentation
 * Excludes: .md files, README, docs/
 */
function isDocumentation(filePath: string): boolean {
  const lowerPath = filePath.toLowerCase();
  
  // Check for .md files
  if (lowerPath.endsWith(".md")) {
    return true;
  }
  
  // Check for README files (README, README.md, README.txt, etc.)
  const fileName = filePath.split("/").pop()?.toLowerCase() || "";
  if (fileName.startsWith("readme")) {
    return true;
  }
  
  // Check for docs/ directory
  if (lowerPath.includes("/docs/") || lowerPath.startsWith("docs/")) {
    return true;
  }
  
  return false;
}

/**
 * Computes the blast radius for a set of changed files
 */
export function computeBlastRadius(changedFiles: string[]): BlastRadius {
  if (!changedFiles || changedFiles.length === 0) {
    return {
      affectedLayers: [],
      layerCounts: {},
      impactScore: 0,
      explanation: "No changes in this PR.",
    };
  }

  // Count files per layer
  const layerCounts: Record<string, number> = {};
  const layersSet = new Set<string>();

  for (const file of changedFiles) {
    const layer = classifyFileLayer(file);
    layersSet.add(layer);
    layerCounts[layer] = (layerCounts[layer] || 0) + 1;
  }

  // Get affected layers as sorted array
  const affectedLayers = Array.from(layersSet).sort();

  // Calculate impact score
  // Formula: min(100, affectedLayers.length * 15 + totalFiles * 2)
  const impactScore = Math.min(
    100,
    affectedLayers.length * 15 + changedFiles.length * 2
  );

  // Generate explanation
  const explanation =
    affectedLayers.length === 0
      ? "No changes in this PR."
      : `Changes affect ${affectedLayers.length} architectural layer${
          affectedLayers.length === 1 ? "" : "s"
        }.`;

  return {
    affectedLayers,
    layerCounts,
    impactScore,
    explanation,
  };
}
