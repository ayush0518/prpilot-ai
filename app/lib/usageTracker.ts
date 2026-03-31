const FREE_ANALYSIS_LIMIT = 3;
const DEFAULT_LIMIT_REACHED_MESSAGE =
  "You’ve reached the free limit (3 PRs). DM for extended access.";
const DEFAULT_LIMIT_REACHED_ERROR = "Free limit reached";

type GlobalWithUsageMap = typeof globalThis & {
  __mergeMindUsageMap?: Map<string, number>;
};

const globalWithUsageMap = globalThis as GlobalWithUsageMap;

const usageMap =
  globalWithUsageMap.__mergeMindUsageMap ??
  (globalWithUsageMap.__mergeMindUsageMap = new Map<string, number>());

function parseList(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

const DEV_IPS = parseList(process.env.MERGEMIND_DEV_IPS ?? process.env.DEV_IPS);
const DEV_GITHUB_USERS = parseList(
  process.env.MERGEMIND_DEV_GITHUB_USERS ?? process.env.MERGEMIND_DEV_GITHUB_USERNAME,
);

export function incrementUsage(key: string): number {
  const nextCount = (usageMap.get(key) ?? 0) + 1;
  usageMap.set(key, nextCount);
  return nextCount;
}

export function isLimitReached(key: string): boolean {
  return (usageMap.get(key) ?? 0) >= FREE_ANALYSIS_LIMIT;
}

export function getUsageCount(key: string): number {
  return usageMap.get(key) ?? 0;
}

export function getClientIp(headers: Headers): string {
  const forwardedFor = headers.get("x-forwarded-for");
  const firstForwardedIp = forwardedFor?.split(",")[0]?.trim();

  return firstForwardedIp || headers.get("x-real-ip")?.trim() || "unknown";
}

export function createIpUsageKey(ip: string): string {
  return `ip:${ip}`;
}

export function createRepoUsageKey(owner: string, repo: string): string {
  return `repo:${owner}/${repo}`;
}

export function isDeveloperIp(ip: string): boolean {
  if (process.env.NODE_ENV !== "production") {
    return true;
  }

  return DEV_IPS.includes(ip);
}

export function isDeveloperRepoOwner(owner: string): boolean {
  if (process.env.NODE_ENV !== "production") {
    return true;
  }

  return DEV_GITHUB_USERS.includes(owner);
}

export function createLimitReachedPayload() {
  return {
    success: false,
    error: DEFAULT_LIMIT_REACHED_ERROR,
    errorCode: "FREE_LIMIT_REACHED",
    message: DEFAULT_LIMIT_REACHED_MESSAGE,
    limit: FREE_ANALYSIS_LIMIT,
  };
}

export const FREE_LIMIT_COMMENT_BODY =
  "MergeMind free limit reached for this repository. Contact for extended access.";

export { DEFAULT_LIMIT_REACHED_MESSAGE, FREE_ANALYSIS_LIMIT };
