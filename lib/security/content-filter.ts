/**
 * Content Filtering - Detects and blocks harmful content
 * Prevents NSFW, violent, and inappropriate content
 */

export interface BlockedCategory {
  name: string;
  keywords: string[];
  severity: 'low' | 'medium' | 'high';
  action: 'warn' | 'block' | 'redact';
}

/**
 * Content filter configuration
 * Can be customized per deployment
 */
export const BLOCKED_CATEGORIES: Record<string, BlockedCategory> = {
  violence: {
    name: 'Violence',
    keywords: [
      'kill', 'murder', 'hurt', 'blood', 'violence', 'bomb', 'attack',
      'weapon', 'gun', 'shoot', 'stab', 'torture', 'abuse', 'assault',
      'brutality', 'slaughter', 'massacre'
    ],
    severity: 'high',
    action: 'block'
  },

  selfHarm: {
    name: 'Self-Harm',
    keywords: [
      'suicide', 'self-harm', 'self harm', 'cutting', 'die', 'death',
      'overdose', 'poison', 'drown', 'hang', 'jump', 'slit', 'cut myself',
      'end my life', 'i want to die', 'kết thúc', 'tự sát', 'tự hủy hoại'
    ],
    severity: 'high',
    action: 'block'
  },

  IllegalActivity: {
    name: 'Illegal Activity',
    keywords: [
      'drug', 'cocaine', 'heroin', 'meth', 'crack', 'steal', 'theft',
      'robbery', 'hacking', 'hack', 'ransomware', 'malware', 'terrorist',
      'illegal', 'fraud', 'scam', 'bribe', 'prostitution', 'sex trade',
      'human trafficking', 'smuggling', 'counterfeit'
    ],
    severity: 'high',
    action: 'block'
  },

  sexualContent: {
    name: 'Sexual Content',
    keywords: [
      'sex', 'porn', 'XXX', 'nude', 'naked', 'penis', 'vagina', 'blowjob',
      'intercourse', 'prostitute', 'escort', 'orgasm', 'cum', 'horny',
      'strip club', 'adult content', 'NSFW', 'sexual', 'erotic'
    ],
    severity: 'medium',
    action: 'block'
  },

  hate: {
    name: 'Hate Speech',
    keywords: [
      'racist', 'racism', 'sexism', 'sexist', 'homophobic', 'transphobic',
      'discriminate', 'discrimination', 'hate', 'inferior', 'superior',
      'ethnic cleansing', 'genocide', 'slur', 'derogatory', 'nazi',
      'kk kkk', 'white power', 'white supremacy'
    ],
    severity: 'high',
    action: 'block'
  },

  harassment: {
    name: 'Harassment',
    keywords: [
      'bully', 'bullying', 'cyberbully', 'harass', 'harassment', 'stalk',
      'stalking', 'threatening', 'threat', 'intimidate', 'intimidation',
      'doxing', 'cancel', 'burn bridges', 'shame', 'humiliate', 'troll',
      'toxic', 'curse', 'insult', 'namecall'
    ],
    severity: 'medium',
    action: 'block'
  },

  medical: {
    name: 'Medical Misinformation',
    keywords: [
      'vaccine cause autism', 'microchip', 'covid hoax', 'vaccine poison',
      'miracle cure', 'essential oils cure cancer', 'homeopathy cure',
      'alternative to medicine', 'medical advice', 'prescription without',
      'diagnosed myself', 'self-diagnosed'
    ],
    severity: 'medium',
    action: 'warn'
  }
};

/**
 * Content filter result
 */
export interface ContentFilterResult {
  isBlocked: boolean;
  warning: boolean;
  categories: string[];
  severity: 'low' | 'medium' | 'high' | 'none';
  message: string;
  redactedContent?: string;
}

/**
 * Detect blocked content in text
 */
export function filterContent(text: string): ContentFilterResult {
  if (!text || typeof text !== 'string') {
    return {
      isBlocked: false,
      warning: false,
      categories: [],
      severity: 'none',
      message: 'OK'
    };
  }

  const lowerText = text.toLowerCase();
  const foundCategories: string[] = [];
  const severities: Array<'low' | 'medium' | 'high'> = [];

  // Check each category
  for (const [key, category] of Object.entries(BLOCKED_CATEGORIES)) {
    for (const keyword of category.keywords) {
      // Check for keyword with word boundaries
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      if (regex.test(lowerText)) {
        foundCategories.push(category.name);
        severities.push(category.severity);
        break; // Move to next category
      }
    }
  }

  const maxSeverity = severities.length > 0
    ? findMaxSeverity(severities)
    : 'none';

  const isBlockingCategory = foundCategories.some(cat => {
    const category = Object.values(BLOCKED_CATEGORIES).find(c => c.name === cat);
    return category?.action === 'block';
  });

  const hasWarningCategory = foundCategories.some(cat => {
    const category = Object.values(BLOCKED_CATEGORIES).find(c => c.name === cat);
    return category?.action === 'warn';
  });

  return {
    isBlocked: isBlockingCategory,
    warning: hasWarningCategory && !isBlockingCategory,
    categories: [...new Set(foundCategories)],
    severity: maxSeverity,
    message: isBlockingCategory
      ? `Content blocked: Contains ${foundCategories.join(', ')}`
      : hasWarningCategory
        ? `Warning: Content may contain sensitive topics: ${foundCategories.join(', ')}`
        : 'OK'
  };
}

/**
 * Redact harmful content
 */
export function redactHarmfulContent(text: string): string {
  if (!text || typeof text !== 'string') return text;

  let redacted = text;

  for (const [, category] of Object.entries(BLOCKED_CATEGORIES)) {
    for (const keyword of category.keywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      redacted = redacted.replace(regex, '[REDACTED]');
    }
  }

  return redacted;
}

/**
 * Helper: Find maximum severity level
 */
function findMaxSeverity(
  severities: Array<'low' | 'medium' | 'high'>
): 'low' | 'medium' | 'high' {
  if (severities.includes('high')) return 'high';
  if (severities.includes('medium')) return 'medium';
  return 'low';
}

/**
 * Safely filter multiple pieces of content
 */
export function filterMultipleContent(
  texts: string[]
): Record<string, ContentFilterResult> {
  const results: Record<string, ContentFilterResult> = {};

  for (const [index, text] of texts.entries()) {
    results[`text_${index}`] = filterContent(text);
  }

  return results;
}

/**
 * Get content filter statistics
 */
export function getFilterStats(): {
  totalCategories: number;
  blockingCategories: number;
  warningCategories: number;
  redactCategories: number;
  totalKeywords: number;
} {
  let blockingCount = 0;
  let warningCount = 0;
  let redactCount = 0;
  let totalKeywords = 0;

  for (const category of Object.values(BLOCKED_CATEGORIES)) {
    if (category.action === 'block') blockingCount++;
    if (category.action === 'warn') warningCount++;
    if (category.action === 'redact') redactCount++;
    totalKeywords += category.keywords.length;
  }

  return {
    totalCategories: Object.keys(BLOCKED_CATEGORIES).length,
    blockingCategories: blockingCount,
    warningCategories: warningCount,
    redactCategories: redactCount,
    totalKeywords
  };
}
