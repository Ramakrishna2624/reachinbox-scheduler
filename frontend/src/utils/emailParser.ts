export interface ParsedEmailResult {
  validEmails: string[];
  invalidCount: number;
  totalExtracted: number;
}

/** Alias used in newer components */
export type ParsedLeads = ParsedEmailResult;

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Safely parses raw text or CSV content and extracts valid email leads.
 * Performs whitespace trimming, lowercase normalization, deduplication, and format validation.
 */
export const parseEmailLeads = (text: string): ParsedEmailResult => {
  if (!text || typeof text !== 'string') {
    return { validEmails: [], invalidCount: 0, totalExtracted: 0 };
  }

  // Split by commas, newlines, semicolons, tabs, or spaces
  const rawTokens = text.split(/[\s,;\n\r]+/);
  
  const validSet = new Set<string>();
  let invalidCount = 0;
  let totalExtracted = 0;

  for (const token of rawTokens) {
    const trimmed = token.trim();
    if (!trimmed) continue;

    totalExtracted++;
    const normalized = trimmed.toLowerCase();

    if (EMAIL_REGEX.test(normalized)) {
      validSet.add(normalized);
    } else {
      invalidCount++;
    }
  }

  return {
    validEmails: Array.from(validSet),
    invalidCount,
    totalExtracted,
  };
};
