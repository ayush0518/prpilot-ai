import { classifyFile, getLanguage, FileType } from "@/app/utils/fileClassifier";

export interface PRFile {
  filename: string;
  language: string;
  additions: number;
  deletions: number;
  patch: string;
  type: FileType;
}

export interface PRContext {
  title: string;
  description: string;
  files: PRFile[];
}

/**
 * Trims patch content to max length
 */
function trimPatch(patch: string, maxLength: number = 2000): string {
  if (patch.length <= maxLength) {
    return patch;
  }
  return patch.substring(0, maxLength) + "\n... (truncated)";
}

/**
 * Extracts basic file information from GitHub API file object
 */
interface GitHubFile {
  filename: string;
  additions: number;
  deletions: number;
  patch?: string;
  changes?: number;
}

/**
 * Builds a structured PR context from GitHub PR data
 */
export function buildPRContext(
  title: string,
  description: string,
  files: GitHubFile[]
): PRContext {
  const processedFiles: PRFile[] = files.map((file) => ({
    filename: file.filename,
    language: getLanguage(file.filename),
    additions: file.additions,
    deletions: file.deletions,
    patch: trimPatch(file.patch || ""),
    type: classifyFile(file.filename),
  }));

  return {
    title,
    description,
    files: processedFiles,
  };
}

/**
 * Calculates statistics about the PR changes
 */
export interface PRStats {
  totalFiles: number;
  totalAdditions: number;
  totalDeletions: number;
  filesByType: Record<string, number>;
  filesByLanguage: Record<string, number>;
}

/**
 * Generates statistics from PR context
 */
export function generatePRStats(context: PRContext): PRStats {
  const filesByType: Record<string, number> = {};
  const filesByLanguage: Record<string, number> = {};
  let totalAdditions = 0;
  let totalDeletions = 0;

  context.files.forEach((file) => {
    totalAdditions += file.additions;
    totalDeletions += file.deletions;

    filesByType[file.type] = (filesByType[file.type] || 0) + 1;
    filesByLanguage[file.language] = (filesByLanguage[file.language] || 0) + 1;
  });

  return {
    totalFiles: context.files.length,
    totalAdditions,
    totalDeletions,
    filesByType,
    filesByLanguage,
  };
}

/**
 * Filters files by type
 */
export function filterFilesByType(context: PRContext, type: FileType): PRFile[] {
  return context.files.filter((file) => file.type === type);
}

/**
 * Gets the largest files by changes
 */
export function getLargestFiles(context: PRContext, limit: number = 5): PRFile[] {
  return [...context.files]
    .sort((a, b) => b.additions + b.deletions - (a.additions + a.deletions))
    .slice(0, limit);
}
