// categories.js
// Default category list and simple domain-based classification rules.
// User overrides (set via the popup) are stored separately in
// chrome.storage.local under "categoryMap" and always take priority.

export const CATEGORIES = [
  "PostgreSQL",
  "TimescaleDB",
  "Programming",
  "AI / ChatGPT",
  "Documentation",
  "GitHub",
  "Other",
];

// Ordered list of (predicate, category) rules. First match wins.
const DEFAULT_RULES = [
  {
    match: (d) => d.includes("chatgpt.com") || d.includes("openai.com"),
    category: "AI / ChatGPT",
  },
  {
    match: (d) => d.includes("timescale.com") || d.includes("timescaledb"),
    category: "TimescaleDB",
  },
  {
    match: (d) => d.includes("postgresql.org") || d.includes("postgres"),
    category: "PostgreSQL",
  },
  {
    match: (d) => d.includes("github.com") || d.includes("gitlab.com"),
    category: "GitHub",
  },
  {
    match: (d) =>
      d.startsWith("docs.") ||
      d.includes("readthedocs.io") ||
      d.includes("devdocs.io") ||
      d.includes("developer.mozilla.org"),
    category: "Documentation",
  },
  {
    match: (d) =>
      d.includes("stackoverflow.com") ||
      d.includes("dev.to") ||
      d.includes("leetcode.com") ||
      d.includes("stackexchange.com"),
    category: "Programming",
  },
];

/**
 * Classify a domain into a category.
 * @param {string} domain - e.g. "docs.timescale.com"
 * @param {Object} categoryMap - user overrides { domain: category }
 * @returns {string} category name
 */
export function classifyDomain(domain, categoryMap = {}) {
  if (!domain) return "Other";
  if (categoryMap[domain]) return categoryMap[domain];

  for (const rule of DEFAULT_RULES) {
    if (rule.match(domain)) return rule.category;
  }
  return "Other";
}
