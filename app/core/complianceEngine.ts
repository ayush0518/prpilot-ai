/**
 * Compliance & Security Engine
 * Detects compliance-sensitive and security-critical changes in PRs
 * Scans file paths and names for sensitive keywords indicating:
 * - Authentication/Authorization logic
 * - Payment processing
 * - Personally Identifiable Information (PII)
 * - Security-critical code
 */

export interface ComplianceResult {
  flags: {
    auth: boolean;
    payment: boolean;
    pii: boolean;
    security: boolean;
  };
  warnings: string[];
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  details: {
    authFiles: string[];
    paymentFiles: string[];
    piiFiles: string[];
    securityFiles: string[];
  };
}

/**
 * Sensitive keyword patterns for compliance detection
 */
const SENSITIVE_PATTERNS = {
  AUTH: ["auth", "login", "jwt", "token", "oauth", "session", "credential", "identity"],
  PAYMENT: ["payment", "billing", "invoice", "stripe", "checkout", "charge", "transaction", "wallet"],
  PII: ["email", "phone", "user", "customer", "ssn", "social", "address", "profile", "personal"],
  SECURITY: ["password", "secret", "key", "encryption", "decrypt", "hash", "cipher", "ssl", "tls"],
};

/**
 * Warning messages for each flag type
 */
const WARNING_TEMPLATES = {
  AUTH: "Authentication logic changed — security review recommended",
  PAYMENT: "Payment flow modified — requires careful validation and compliance check",
  PII: "PII-related fields touched — ensure GDPR and data protection compliance",
  SECURITY: "Security-critical code modified — mandatory security review required",
};

/**
 * Strict file-level matching for auth files
 * Only files that explicitly match auth patterns are flagged
 */
function isAuthFile(filePath: string): boolean {
  const path = filePath.toLowerCase();
  
  return (
    path.includes("/auth") ||
    path.includes("login") ||
    path.includes("user-auth") ||
    path.includes("jwt") ||
    path.includes("session")
  );
}

/**
 * Scans file path and name for sensitive keywords
 * Uses strict matching for AUTH files to avoid over-detection
 */
function checkForSensitiveKeywords(filePath: string): Partial<Record<keyof typeof SENSITIVE_PATTERNS, boolean>> {
  const lowerPath = filePath.toLowerCase();
  const detected: Partial<Record<keyof typeof SENSITIVE_PATTERNS, boolean>> = {};

  // Use strict AUTH matching instead of broad pattern matching
  detected['AUTH'] = isAuthFile(filePath);

  // PAYMENT: Keep patterns as-is (relatively specific)
  detected['PAYMENT'] = SENSITIVE_PATTERNS.PAYMENT.some(pattern => lowerPath.includes(pattern));

  // PII: Use stricter patterns - exclude generic "user" keyword
  const restrictedPIIPatterns = ["email", "phone", "customer", "ssn", "social", "address", "profile", "personal"];
  detected['PII'] = restrictedPIIPatterns.some(pattern => lowerPath.includes(pattern));

  // SECURITY: Keep patterns as-is (specific security keywords)
  detected['SECURITY'] = SENSITIVE_PATTERNS.SECURITY.some(pattern => lowerPath.includes(pattern));

  return detected;
}

/**
 * Analyzes changed files for compliance-sensitive changes
 */
export function analyzeCompliance(filePaths: string[]): ComplianceResult {
  if (!filePaths || filePaths.length === 0) {
    return {
      flags: {
        auth: false,
        payment: false,
        pii: false,
        security: false,
      },
      warnings: [],
      riskLevel: "LOW",
      details: {
        authFiles: [],
        paymentFiles: [],
        piiFiles: [],
        securityFiles: [],
      },
    };
  }

  // Aggregate detections across all files
  const aggregatedFlags = {
    auth: false,
    payment: false,
    pii: false,
    security: false,
  };

  const warnings: Set<string> = new Set();
  const detectedCategories: string[] = [];
  
  // Track files for each category
  const details = {
    authFiles: [] as string[],
    paymentFiles: [] as string[],
    piiFiles: [] as string[],
    securityFiles: [] as string[],
  };

  for (const filePath of filePaths) {
    const detections = checkForSensitiveKeywords(filePath);

    if (detections.AUTH) {
      aggregatedFlags.auth = true;
      details.authFiles.push(filePath);
      if (!detectedCategories.includes("AUTH")) {
        detectedCategories.push("AUTH");
        warnings.add(WARNING_TEMPLATES.AUTH);
      }
    }

    if (detections.PAYMENT) {
      aggregatedFlags.payment = true;
      details.paymentFiles.push(filePath);
      if (!detectedCategories.includes("PAYMENT")) {
        detectedCategories.push("PAYMENT");
        warnings.add(WARNING_TEMPLATES.PAYMENT);
      }
    }

    if (detections.PII) {
      aggregatedFlags.pii = true;
      details.piiFiles.push(filePath);
      if (!detectedCategories.includes("PII")) {
        detectedCategories.push("PII");
        warnings.add(WARNING_TEMPLATES.PII);
      }
    }

    if (detections.SECURITY) {
      aggregatedFlags.security = true;
      details.securityFiles.push(filePath);
      if (!detectedCategories.includes("SECURITY")) {
        detectedCategories.push("SECURITY");
        warnings.add(WARNING_TEMPLATES.SECURITY);
      }
    }
  }

  // Determine risk level based on detected flags
  // HIGH: payment OR (auth AND security)
  // MEDIUM: any one of payment/auth/pii/security
  // LOW: none detected
  let riskLevel: "LOW" | "MEDIUM" | "HIGH" = "LOW";

  if (aggregatedFlags.payment || (aggregatedFlags.auth && aggregatedFlags.security)) {
    riskLevel = "HIGH";
  } else if (aggregatedFlags.payment || aggregatedFlags.auth || aggregatedFlags.pii || aggregatedFlags.security) {
    riskLevel = "MEDIUM";
  }

  return {
    flags: aggregatedFlags,
    warnings: Array.from(warnings),
    riskLevel,
    details,
  };
}
