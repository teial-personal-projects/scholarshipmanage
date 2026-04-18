import DOMPurify from 'dompurify';

/**
 * Client-side HTML Sanitization Utility
 *
 * Uses DOMPurify to sanitize HTML in the browser.
 * Protects against XSS attacks by removing dangerous HTML/JavaScript.
 *
 * Best Practices Implemented:
 * - Whitelist approach (only allow safe tags/attributes)
 * - Remove all script execution vectors
 * - Strip event handlers (onclick, onerror, etc.)
 * - Remove dangerous protocols (javascript:, data:, vbscript:)
 * - Normalize HTML structure
 */

/**
 * HTML Sanitization Configuration Profiles
 */
export const SanitizationProfiles: Record<string, any> = {
  /**
   * STRICT: Minimal formatting only
   * Use for: Notes, descriptions, short text fields
   * Allows: Basic text formatting (bold, italic, emphasis, strong)
   */
  STRICT: {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'br'],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
    ALLOW_DATA_ATTR: false,
  },

  /**
   * BASIC: Standard rich text formatting
   * Use for: Essays, longer content, rich text editors
   * Allows: Paragraphs, lists, links, basic formatting
   */
  BASIC: {
    ALLOWED_TAGS: [
      // Text formatting
      'b', 'i', 'em', 'strong', 'u', 's', 'sup', 'sub',
      // Structure
      'p', 'br', 'hr',
      // Lists
      'ul', 'ol', 'li',
      // Links
      'a',
      // Headings (h3-h6 only, no h1-h2 to prevent hierarchy issues)
      'h3', 'h4', 'h5', 'h6',
    ],
    ALLOWED_ATTR: ['href', 'title', 'target', 'rel'],
    KEEP_CONTENT: true,
    ALLOW_DATA_ATTR: false,
    // Additional configuration for links
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  },

  /**
   * EXTENDED: Full rich text with tables and blockquotes
   * Use for: Documentation, comprehensive content
   * Allows: Everything in BASIC plus tables, blockquotes, code blocks
   */
  EXTENDED: {
    ALLOWED_TAGS: [
      // Text formatting
      'b', 'i', 'em', 'strong', 'u', 's', 'sup', 'sub', 'mark', 'small',
      // Structure
      'p', 'br', 'hr', 'div', 'span',
      // Lists
      'ul', 'ol', 'li',
      // Links
      'a',
      // Headings
      'h3', 'h4', 'h5', 'h6',
      // Tables
      'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
      // Quotes and code
      'blockquote', 'code', 'pre',
    ],
    ALLOWED_ATTR: ['href', 'title', 'target', 'rel', 'class'],
    KEEP_CONTENT: true,
    ALLOW_DATA_ATTR: false,
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  },

  /**
   * PLAIN_TEXT: Strip all HTML
   * Use for: Extracting plain text from HTML
   * Result: Plain text only, no tags
   */
  PLAIN_TEXT: {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  },
};

export type SanitizationProfile = keyof typeof SanitizationProfiles;

/**
 * Custom sanitization options
 */
export interface SanitizeOptions {
  /**
   * Predefined sanitization profile
   */
  profile?: SanitizationProfile;

  /**
   * Custom DOMPurify configuration (overrides profile)
   */
  customConfig?: any;

  /**
   * Maximum length after sanitization (characters)
   */
  maxLength?: number;

  /**
   * Return null if input is empty/null instead of empty string
   */
  returnNullIfEmpty?: boolean;
}

/**
 * Sanitize HTML content
 *
 * @param html - Raw HTML content to sanitize
 * @param options - Sanitization options
 * @returns Sanitized HTML safe for rendering
 *
 * @example
 * // Basic usage with default BASIC profile
 * const clean = sanitizeHtml('<p>Hello <script>alert("XSS")</script></p>');
 * // Returns: '<p>Hello </p>'
 *
 * @example
 * // Use STRICT profile for notes
 * const clean = sanitizeHtml(userNote, { profile: 'STRICT' });
 *
 * @example
 * // Use EXTENDED profile for documentation
 * const clean = sanitizeHtml(content, { profile: 'EXTENDED' });
 *
 * @example
 * // Custom configuration
 * const clean = sanitizeHtml(html, {
 *   customConfig: {
 *     ALLOWED_TAGS: ['p', 'br'],
 *     ALLOWED_ATTR: []
 *   }
 * });
 */
export function sanitizeHtml(
  html: string | null | undefined,
  options: SanitizeOptions = {}
): string | null {
  // Handle null/undefined input
  if (html === null || html === undefined || html === '') {
    return options.returnNullIfEmpty ? null : '';
  }

  const {
    profile = 'BASIC',
    customConfig,
    maxLength,
    returnNullIfEmpty = false,
  } = options;

  // Get configuration from profile or use custom config
  const config = customConfig || SanitizationProfiles[profile];

  // Configure DOMPurify hooks to add additional security
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    // Force all links to open in new tab with security attributes
    if (node.tagName === 'A') {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer');
    }
  });

  // Sanitize the HTML
  let sanitized = DOMPurify.sanitize(html, config) as unknown as string;

  // Remove the hook after use to prevent side effects
  DOMPurify.removeAllHooks();

  // Trim whitespace
  sanitized = sanitized.trim() as string;

  // Apply max length if specified
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  // Return null if empty and option is set
  if (returnNullIfEmpty && sanitized === '') {
    return null;
  }

  return sanitized;
}

/**
 * Sanitize HTML for notes/descriptions (STRICT profile)
 *
 * @example
 * const clean = sanitizeNote('<b>Important</b> <script>alert("XSS")</script>');
 * // Returns: '<b>Important</b> '
 */
export function sanitizeNote(html: string | null | undefined, maxLength = 5000): string | null {
  return sanitizeHtml(html, {
    profile: 'STRICT',
    maxLength,
    returnNullIfEmpty: true,
  });
}

/**
 * Sanitize HTML for essays/rich content (BASIC profile)
 *
 * @example
 * const clean = sanitizeEssay('<p>My essay <script>alert("XSS")</script></p>');
 * // Returns: '<p>My essay </p>'
 */
export function sanitizeEssay(html: string | null | undefined, maxLength = 50000): string | null {
  return sanitizeHtml(html, {
    profile: 'BASIC',
    maxLength,
    returnNullIfEmpty: true,
  });
}

/**
 * Sanitize HTML for documentation/comprehensive content (EXTENDED profile)
 *
 * @example
 * const clean = sanitizeDocumentation(content);
 */
export function sanitizeDocumentation(html: string | null | undefined, maxLength = 100000): string | null {
  return sanitizeHtml(html, {
    profile: 'EXTENDED',
    maxLength,
    returnNullIfEmpty: true,
  });
}

/**
 * Convert HTML to plain text (strips all tags)
 *
 * @example
 * const text = htmlToPlainText('<p>Hello <b>world</b></p>');
 * // Returns: 'Hello world'
 */
export function htmlToPlainText(html: string | null | undefined, maxLength?: number): string | null {
  return sanitizeHtml(html, {
    profile: 'PLAIN_TEXT',
    maxLength,
    returnNullIfEmpty: true,
  });
}

/**
 * Validate that HTML content is safe (returns true if sanitization doesn't change it)
 * Use this to warn users if their content was modified during sanitization
 *
 * @example
 * const isSafe = isHtmlSafe('<p>Safe content</p>'); // true
 * const isUnsafe = isHtmlSafe('<script>alert("XSS")</script>'); // false
 */
export function isHtmlSafe(
  html: string | null | undefined,
  options: SanitizeOptions = {}
): boolean {
  if (!html) return true;

  const sanitized = sanitizeHtml(html, options);
  return html.trim() === sanitized?.trim();
}

/**
 * Get information about what was removed during sanitization
 * Useful for providing feedback to users about rejected content
 *
 * @returns Object with original length, sanitized length, and whether content was modified
 */
export function getSanitizationInfo(
  html: string | null | undefined,
  options: SanitizeOptions = {}
): {
  originalLength: number;
  sanitizedLength: number;
  wasModified: boolean;
  removedContent: boolean;
} {
  const original = html?.trim() || '';
  const sanitized = sanitizeHtml(html, options) || '';

  return {
    originalLength: original.length,
    sanitizedLength: sanitized.length,
    wasModified: original !== sanitized,
    removedContent: original.length > sanitized.length,
  };
}
