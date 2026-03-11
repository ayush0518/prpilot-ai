export type FileType = "UI Component" | "Business Logic" | "API Layer" | "Configuration" | "Test File" | "Other";

/**
 * Classifies a file based on its extension
 */
export function classifyFile(filename: string): FileType {
  const extension = filename.toLowerCase().split(".").pop() || "";

  // UI Component
  if (extension === "tsx" || extension === "jsx") {
    return "UI Component";
  }

  // Test File
  if (filename.toLowerCase().includes(".test.") || filename.toLowerCase().includes(".spec.")) {
    return "Test File";
  }

  // Configuration
  if (
    extension === "json" ||
    extension === "env" ||
    extension === "config" ||
    extension === "yaml" ||
    extension === "yml" ||
    extension === "toml" ||
    extension === "xml" ||
    extension === "ini"
  ) {
    return "Configuration";
  }

  // API Layer
  if (extension === "graphql" || extension === "gql") {
    return "API Layer";
  }

  // Business Logic (TypeScript/JavaScript)
  if (extension === "ts" || extension === "js" || extension === "mts" || extension === "mjs") {
    return "Business Logic";
  }

  // Other
  return "Other";
}

/**
 * Derives programming language from file extension
 */
export function getLanguage(filename: string): string {
  const extension = filename.toLowerCase().split(".").pop() || "";

  const languageMap: Record<string, string> = {
    tsx: "TypeScript React",
    ts: "TypeScript",
    jsx: "JavaScript React",
    js: "JavaScript",
    mts: "TypeScript",
    mjs: "JavaScript",
    py: "Python",
    java: "Java",
    cs: "C#",
    cpp: "C++",
    c: "C",
    go: "Go",
    rs: "Rust",
    rb: "Ruby",
    php: "PHP",
    swift: "Swift",
    kt: "Kotlin",
    graphql: "GraphQL",
    gql: "GraphQL",
    sql: "SQL",
    json: "JSON",
    xml: "XML",
    yaml: "YAML",
    yml: "YAML",
    css: "CSS",
    scss: "SCSS",
    sass: "SASS",
    less: "Less",
    html: "HTML",
    md: "Markdown",
    sh: "Shell",
    bash: "Bash",
  };

  return languageMap[extension] || "Unknown";
}
