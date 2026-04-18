import { z } from 'zod';
import {
  parsePhoneNumber,
  isValidPhoneNumber,
  type CountryCode,
} from 'libphonenumber-js';

/**
 * Input validation and sanitization utilities
 * Used to validate and sanitize user input before saving to database
 */

/**
 * Sanitize string input
 * - Trims whitespace
 * - Limits length (optional)
 */
export function sanitizeString(input: string | undefined | null, maxLength?: number): string | undefined {
  if (!input) return undefined;
  
  let sanitized = input.trim();
  
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  return sanitized || undefined;
}

/**
 * Validate and sanitize email address
 */
export function sanitizeEmail(email: string | undefined | null): string | undefined {
  if (!email) return undefined;
  
  const trimmed = email.trim().toLowerCase();
  
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    throw new Error('Invalid email format');
  }
  
  return trimmed;
}

/**
 * Validate and sanitize URL
 */
export function sanitizeUrl(url: string | undefined | null): string | undefined {
  if (!url) return undefined;
  
  const trimmed = url.trim();
  
  // Basic URL validation
  try {
    new URL(trimmed);
    return trimmed;
  } catch {
    throw new Error('Invalid URL format');
  }
}

/**
 * Phone number validation options
 * 
 * @example
 * // Validate US number with default country
 * sanitizePhoneNumber('(415) 555-2671', { defaultCountry: 'US', format: 'E164' })
 * // Returns: '+14155552671'
 * 
 * @example
 * // Validate international number without default country
 * sanitizePhoneNumber('+44 20 7946 0958')
 * // Returns: '+442079460958'
 */
export interface PhoneValidationOptions {
  /**
   * Default country code to use when number doesn't include country code
   * Uses ISO 3166-1 alpha-2 country codes (e.g., 'US', 'GB', 'CA')
   * If not provided, will attempt to parse without default country
   */
  defaultCountry?: CountryCode;
  
  /**
   * Format to return the phone number in
   * - 'E164': International format with + prefix (e.g., +14155552671) - RECOMMENDED for storage
   * - 'NATIONAL': National format (e.g., (415) 555-2671)
   * - 'INTERNATIONAL': International format with spaces (e.g., +1 415 555 2671)
   * - 'raw': Keep original format
   */
  format?: 'E164' | 'NATIONAL' | 'INTERNATIONAL' | 'raw';
  
  /**
   * If true, allows partial/incomplete numbers (not recommended for storage)
   */
  allowPartial?: boolean;
}

/**
 * Validate and sanitize international phone number
 * 
 * @param phone - Phone number string (can be in any format)
 * @param options - Validation options
 * @returns Formatted phone number or undefined if input is empty
 * @throws Error if phone number is invalid
 * 
 * @example
 * // US number
 * sanitizePhoneNumber('(415) 555-2671', { defaultCountry: 'US' })
 * // Returns: '+14155552671'
 * 
 * // International number with country code
 * sanitizePhoneNumber('+44 20 7946 0958')
 * // Returns: '+442079460958'
 * 
 * // UK number with default country
 * sanitizePhoneNumber('020 7946 0958', { defaultCountry: 'GB' })
 * // Returns: '+442079460958'
 */
export function sanitizePhoneNumber(
  phone: string | undefined | null,
  options: PhoneValidationOptions = {}
): string | undefined {
  if (!phone) return undefined;
  
  const trimmed = phone.trim();
  if (!trimmed) return undefined;
  
  const {
    defaultCountry,
    format = 'E164',
    allowPartial = false,
  } = options;
  
  try {
    // Try to parse the phone number
    const phoneNumber = parsePhoneNumber(trimmed, defaultCountry);
    
    // Validate if not allowing partial numbers
    if (!allowPartial && !phoneNumber.isValid()) {
      throw new Error(`Invalid phone number: ${phoneNumber.formatInternational()}`);
    }
    
    // Format according to requested format
    switch (format) {
      case 'E164':
        return phoneNumber.format('E.164'); // Returns e.g., +14155552671
      case 'NATIONAL':
        return phoneNumber.formatNational(); // Returns e.g., (415) 555-2671
      case 'INTERNATIONAL':
        return phoneNumber.formatInternational(); // Returns e.g., +1 415 555 2671
      case 'raw':
      default:
        return trimmed; // Keep original
    }
  } catch (error) {
    // If parsing fails, provide helpful error message
    if (error instanceof Error) {
      throw new Error(`Invalid phone number format: ${error.message}`);
    }
    throw new Error('Invalid phone number format');
  }
}

/**
 * Validate phone number without formatting
 * Useful for validation-only checks
 */
export function validatePhoneNumber(
  phone: string | undefined | null,
  defaultCountry?: CountryCode
): boolean {
  if (!phone) return false;
  
  try {
    const trimmed = phone.trim();
    if (!trimmed) return false;
    
    return isValidPhoneNumber(trimmed, defaultCountry);
  } catch {
    return false;
  }
}

/**
 * Get country calling code from phone number
 * Returns the country code (e.g., '1' for US, '44' for UK)
 */
export function getPhoneCountryCode(
  phone: string | undefined | null,
  defaultCountry?: CountryCode
): string | undefined {
  if (!phone) return undefined;
  
  try {
    const trimmed = phone.trim();
    if (!trimmed) return undefined;
    
    const phoneNumber = parsePhoneNumber(trimmed, defaultCountry);
    return phoneNumber.countryCallingCode;
  } catch {
    return undefined;
  }
}

/**
 * Get country ISO code from phone number
 * Returns the ISO 3166-1 alpha-2 country code (e.g., 'US', 'GB')
 */
export function getPhoneCountry(
  phone: string | undefined | null,
  defaultCountry?: CountryCode
): CountryCode | undefined {
  if (!phone) return undefined;
  
  try {
    const trimmed = phone.trim();
    if (!trimmed) return undefined;
    
    const phoneNumber = parsePhoneNumber(trimmed, defaultCountry);
    return phoneNumber.country;
  } catch {
    return undefined;
  }
}

/**
 * Validate enum value
 */
export function validateEnum<T extends string>(
  value: string | undefined | null,
  allowedValues: readonly T[]
): T | undefined {
  if (!value) return undefined;
  
  const trimmed = value.trim();
  
  if (!allowedValues.includes(trimmed as T)) {
    throw new Error(`Invalid value. Must be one of: ${allowedValues.join(', ')}`);
  }
  
  return trimmed as T;
}

/**
 * Common validation schemas using Zod
 */

// Email schema - preprocess to trim and lowercase, then validate
export const emailSchema = z.preprocess(
  (val) => {
    if (typeof val === 'string') {
      return val.trim().toLowerCase();
    }
    return val;
  },
  z.string().email().max(255)
);

// URL schema
export const urlSchema = z.string().url().max(2048).transform(val => val.trim());

/**
 * Zod schema for phone number validation
 * 
 * @param defaultCountry - Default country code (ISO 3166-1 alpha-2)
 * @param format - Format to store the number in (default: 'E164')
 * @returns Zod schema for phone number validation
 * 
 * @example
 * // Basic usage
 * const schema = phoneSchema();
 * 
 * // With default country
 * const schema = phoneSchema('US');
 * 
 * // Store in national format
 * const schema = phoneSchema('US', 'NATIONAL');
 */
export function phoneSchema(defaultCountry?: CountryCode, format: 'E164' | 'NATIONAL' | 'INTERNATIONAL' = 'E164') {
  return z
    .union([
      z.string().trim(),
      z.null(),
    ])
    .refine(
      (val) => {
        // Allow null/empty values
        if (val === null) return true;
        if (typeof val !== 'string' || !val.trim()) return true;
        // Validate non-empty strings
        try {
          return isValidPhoneNumber(val.trim(), defaultCountry);
        } catch {
          return false;
        }
      },
      {
        message: `Invalid phone number format${defaultCountry ? ` for ${defaultCountry}` : ''}`,
      }
    )
    .transform((val) => {
      // Convert null/undefined/empty to undefined
      if (val === null || val === undefined || !val || !val.trim()) {
        return undefined;
      }
      
      const trimmed = val.trim();
      if (!trimmed) return undefined;
      
      try {
        const phoneNumber = parsePhoneNumber(trimmed, defaultCountry);
        
        switch (format) {
          case 'E164':
            return phoneNumber.format('E.164');
          case 'NATIONAL':
            return phoneNumber.formatNational();
          case 'INTERNATIONAL':
            return phoneNumber.formatInternational();
          default:
            return trimmed;
        }
      } catch (error) {
        throw new z.ZodError([
          {
            code: 'custom',
            path: [],
            message: error instanceof Error ? error.message : `Invalid phone number format${defaultCountry ? ` for ${defaultCountry}` : ''}`,
          },
        ]);
      }
    })
    .optional();
}

/**
 * Default phone schema using E.164 format (recommended for storage)
 * Accepts international phone numbers in any format
 */
export const internationalPhoneSchema = phoneSchema();

// Common string schemas with length limits
export const shortStringSchema = z.string().max(100).transform(val => val.trim());
export const mediumStringSchema = z.string().max(255).transform(val => val.trim());
export const longStringSchema = z.string().max(5000).transform(val => val.trim());
export const nameSchema = z.string().min(1).max(100).transform(val => val.trim());

// Number schemas
export const positiveNumberSchema = z.number().positive();
export const nonNegativeNumberSchema = z.number().nonnegative();

// Date schema
export const dateSchema = z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/));

/**
 * HTML content schemas with length limits
 * Note: Actual HTML sanitization happens server-side and client-side
 * These schemas just validate length and basic structure
 */
export const htmlNoteSchema = z.string().max(5000).transform(val => val.trim()).optional();
export const htmlEssaySchema = z.string().max(50000).transform(val => val.trim()).optional();
export const htmlDocumentationSchema = z.string().max(100000).transform(val => val.trim()).optional();

// Placeholder for additional Zod validation schemas
// These will be implemented as needed throughout the project
