/**
 * Blast Radius Engine
 * Determines which architectural layers of the system are affected by a PR
 * based on changed file paths. Uses weighted scoring to more accurately
 * reflect impact, ignoring low-impact files like documentation and config.
 */

import { LayerFile, LayerDetailsData } from "@/app/types/prAnalysis";

export interface BlastRadius {
  affectedLayers: string[];
  layerCounts: Record<string, number>;
  impactScore: number;
  explanation: string;
  layerDetails: Record<string, LayerDetailsData>;
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
  | "UI"
  | "Domain"
  | "Infra"
  | "Assets"
  | "Other";

/**
 * Layer weights for impact scoring
 * Higher weights mean more critical impact
 */
const LAYER_WEIGHTS: Record<ArchitecturalLayer, number> = {
  API: 5,
  Service: 4,
  Utility: 2,
  Middleware: 4,
  Config: 1,
  Test: 1,
  Documentation: 0,
  UI: 2,
  Domain: 4,
  Infra: 1,
  Assets: 1,
  Other: 1,
};

/**
 * Files to exclude from impact scoring (but still count in layerCounts)
 */
function isLowImpactFile(filePath: string): boolean {
  const lowerPath = filePath.toLowerCase();
  
  // Documentation files
  if (lowerPath.endsWith(".md") || lowerPath.startsWith("readme")) {
    return true;
  }
  
  // Config files
  const configPatterns = [
    "package.json",
    "tsconfig.json",
    "jest.config.js",
    "postcss.config",
    "tailwind.config",
    ".eslintrc",
    ".prettierrc",
  ];
  
  if (configPatterns.some(pattern => lowerPath.includes(pattern.toLowerCase()))) {
    return true;
  }
  
  return false;
}

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

  // UI layer - check for /app/, /components/, or .tsx/.css files
  if (
    lowerPath.includes("/app/") ||
    lowerPath.includes("/components/") ||
    lowerPath.endsWith(".tsx") ||
    lowerPath.endsWith(".css")
  ) {
    return "UI";
  }

  // Domain layer - /lib/, /core/, or business logic
  if (lowerPath.includes("/lib/") || lowerPath.includes("/core/")) {
    return "Domain";
  }

  // Assets layer - /public/, .svg, .ico, or image files
  if (
    lowerPath.includes("/public/") ||
    lowerPath.endsWith(".svg") ||
    lowerPath.endsWith(".ico") ||
    lowerPath.endsWith(".png") ||
    lowerPath.endsWith(".jpg") ||
    lowerPath.endsWith(".jpeg") ||
    lowerPath.endsWith(".gif") ||
    lowerPath.endsWith(".webp")
  ) {
    return "Assets";
  }

  // Infra layer - package.json, configs, tsconfig, prisma
  if (
    lowerPath.includes("package.json") ||
    lowerPath.includes("tsconfig") ||
    lowerPath.includes("prisma") ||
    lowerPath.includes(".env") ||
    lowerPath.includes("jest.config") ||
    lowerPath.includes("postcss.config") ||
    lowerPath.includes("tailwind.config") ||
    lowerPath.includes(".eslintrc") ||
    lowerPath.includes(".prettierrc") ||
    lowerPath.includes("next.config")
  ) {
    return "Infra";
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
 * Generates a human-readable reason for why a file is impacted
 * Uses priority order to ensure specific matches take precedence
 */
function generateFileReason(filePath: string): string {
  const lowerPath = filePath.toLowerCase();
  const fileName = filePath.split("/").pop() || "";

  // Priority 1: API route handlers (most specific)
  if (fileName.includes("route.ts") || fileName.includes("route.js")) {
    return "API route handler updated";
  }

  // Priority 2: Database schema
  if (lowerPath.includes("schema.prisma")) {
    return "Database schema modified";
  }

  // Priority 3: Authentication (only specific auth files)
  if (lowerPath.includes("/auth") && fileName.endsWith(".ts")) {
    return "Authentication logic updated";
  }

  // Priority 4: CSS/Styling
  if (fileName.endsWith(".css")) {
    return "Styling updated";
  }

  // Priority 5: Page components
  if (fileName.includes("page.tsx") || fileName.includes("page.ts")) {
    return "UI page updated";
  }

  // Priority 6: Layout components
  if (fileName.includes("layout.tsx") || fileName.includes("layout.ts")) {
    return "Application layout updated";
  }

  // Priority 7: Environment configuration
  if (lowerPath.includes(".env")) {
    return "Environment configuration updated";
  }

  // Priority 8: Service layer
  if (lowerPath.includes("/services/")) {
    return "Business logic updated";
  }

  // Priority 9: Utility functions
  if (lowerPath.includes("/utils/") || lowerPath.includes("/helpers/")) {
    return "Shared utility updated";
  }

  // Priority 10: Test files
  if (lowerPath.includes("test") || lowerPath.includes("__tests__") || lowerPath.includes(".spec.") || lowerPath.includes(".test.")) {
    return "Test coverage updated";
  }

  // Priority 11: Documentation
  if (lowerPath.endsWith(".md") || fileName.toLowerCase().startsWith("readme")) {
    return "Documentation updated";
  }

  // Priority 12: UI components
  if (lowerPath.includes("/components/") || lowerPath.endsWith(".tsx")) {
    return "UI component modified";
  }

  // Fallback
  return "General logic update";
}

/**
 * Determines the change type based on the layer
 */
function determineChangeType(layer: ArchitecturalLayer): "core" | "supporting" | "config" {
  switch (layer) {
    case "API":
    case "Service":
    case "Middleware":
    case "Domain":
      return "core";
    case "Config":
    case "Documentation":
    case "Infra":
      return "config";
    case "Utility":
    case "Test":
    case "UI":
    case "Assets":
    case "Other":
    default:
      return "supporting";
  }
}

/**
 * Determines if a file is critical based on strict rules
 * Only marks true entry points and schema files as critical
 */
function isCriticalFile(filePath: string): boolean {
  const lowerPath = filePath.toLowerCase();
  const fileName = filePath.split("/").pop() || "";

  // Rule 1: API route entry points (route.ts files)
  if (fileName === "route.ts" || fileName === "route.js") {
    return true;
  }

  // Rule 2: Database schema definition
  if (lowerPath.includes("schema.prisma")) {
    return true;
  }

  // Rule 3: Middleware (top-level entries)
  if (fileName === "middleware.ts" || fileName === "middleware.js") {
    return true;
  }

  // Rule 4: Auth core files - UPDATED with user-auth support
  if (
    lowerPath.includes("/auth.ts") ||
    lowerPath.includes("/auth/") ||
    lowerPath.includes("user-auth.ts") ||
    lowerPath.includes("user-auth/")
  ) {
    return true;
  }

  // Rule 5: Payment core files (strict match)
  if (lowerPath.includes("/payment/route.ts")) {
    return true;
  }

  // Everything else is not critical
  return false;
}

/**
 * Computes the blast radius for a set of changed files
 * Uses weighted scoring approach to reflect true impact
 */
export function computeBlastRadius(changedFiles: string[]): BlastRadius {
  if (!changedFiles || changedFiles.length === 0) {
    return {
      affectedLayers: [],
      layerCounts: {},
      impactScore: 0,
      explanation: "No changes in this PR.",
      layerDetails: {},
    };
  }

  // Count files per layer and calculate weighted impact
  const layerCounts: Record<string, number> = {};
  const layersSet = new Set<string>();
  const layerFilesMap: Record<string, LayerFile[]> = {};
  let weightedScore = 0;
  const impactingLayers: string[] = [];

  for (const file of changedFiles) {
    const layer = classifyFileLayer(file);
    layersSet.add(layer);
    layerCounts[layer] = (layerCounts[layer] || 0) + 1;
    
    // Build layer files map for layerDetails
    if (!layerFilesMap[layer]) {
      layerFilesMap[layer] = [];
    }
    
    const layerFile: LayerFile = {
      path: file,
      reason: generateFileReason(file),
      changeType: determineChangeType(layer),
      isCritical: isCriticalFile(file),
    };
    layerFilesMap[layer].push(layerFile);
    
    // Only count towards impact score if not low-impact
    if (!isLowImpactFile(file)) {
      const weight = LAYER_WEIGHTS[layer];
      weightedScore += weight;
      if (!impactingLayers.includes(layer)) {
        impactingLayers.push(layer);
      }
    }
  }

  // Get affected layers as sorted array
  const affectedLayers = Array.from(layersSet).sort();

  // Build layerDetails object
  const layerDetails: Record<string, LayerDetailsData> = {};
  for (const layer of affectedLayers) {
    layerDetails[layer] = {
      count: layerCounts[layer] || 0,
      files: layerFilesMap[layer] || [],
    };
  }

  // Calculate impact score using weighted formula
  // Formula: min(100, sum(layerCounts[layer] * LAYER_WEIGHTS[layer]))
  const impactScore = Math.min(100, weightedScore);

  // Generate improved explanation
  let explanation = "No changes in this PR.";
  if (impactingLayers.length > 0) {
    const layerList = impactingLayers.join(", ");
    if (affectedLayers.length === 1) {
      explanation = `Changes affect ${affectedLayers[0]} layer across ${layerCounts[affectedLayers[0]]} file${
        layerCounts[affectedLayers[0]] !== 1 ? "s" : ""
      }.`;
    } else {
      explanation = `High impact: ${layerList} layers modified across ${
        affectedLayers.reduce((sum, layer) => sum + (layerCounts[layer] || 0), 0)
      } files.`;
    }
  } else if (affectedLayers.length > 0) {
    // Only low-impact files changed
    explanation = "Low impact: only configuration and documentation files modified.";
  }

  return {
    affectedLayers,
    layerCounts,
    impactScore,
    explanation,
    layerDetails,
  };
}
