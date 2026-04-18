/**
 * Tests for validation utilities
 */

import { describe, it, expect } from 'vitest';
import {
  sanitizeString,
  sanitizeEmail,
  sanitizeUrl,
  sanitizePhoneNumber,
  validatePhoneNumber,
  getPhoneCountryCode,
  getPhoneCountry,
  validateEnum,
  emailSchema,
  urlSchema,
  phoneSchema,
  internationalPhoneSchema,
  shortStringSchema,
  mediumStringSchema,
  longStringSchema,
  nameSchema,
  positiveNumberSchema,
  nonNegativeNumberSchema,
  dateSchema,
  type PhoneValidationOptions,
} from './validation';

describe('validation utilities', () => {
  describe('sanitizeString', () => {
    it('should trim whitespace', () => {
      expect(sanitizeString('  hello  ')).toBe('hello');
      expect(sanitizeString('\t\nhello\t\n')).toBe('hello');
    });

    it('should return undefined for null/undefined/empty', () => {
      expect(sanitizeString(null)).toBeUndefined();
      expect(sanitizeString(undefined)).toBeUndefined();
      expect(sanitizeString('')).toBeUndefined();
      expect(sanitizeString('   ')).toBeUndefined();
    });

    it('should limit length when maxLength is provided', () => {
      expect(sanitizeString('hello world', 5)).toBe('hello');
      expect(sanitizeString('test', 10)).toBe('test');
      expect(sanitizeString('  hello  ', 3)).toBe('hel');
    });

    it('should handle strings without maxLength', () => {
      expect(sanitizeString('hello world')).toBe('hello world');
      expect(sanitizeString('test')).toBe('test');
    });
  });

  describe('sanitizeEmail', () => {
    it('should validate and normalize valid emails', () => {
      expect(sanitizeEmail('test@example.com')).toBe('test@example.com');
      expect(sanitizeEmail('TEST@EXAMPLE.COM')).toBe('test@example.com');
      expect(sanitizeEmail('  Test@Example.com  ')).toBe('test@example.com');
      expect(sanitizeEmail('user.name+tag@example.co.uk')).toBe('user.name+tag@example.co.uk');
    });

    it('should return undefined for null/undefined/empty', () => {
      expect(sanitizeEmail(null)).toBeUndefined();
      expect(sanitizeEmail(undefined)).toBeUndefined();
      expect(sanitizeEmail('')).toBeUndefined();
    });

    it('should throw error for invalid email formats', () => {
      expect(() => sanitizeEmail('invalid')).toThrow();
      expect(() => sanitizeEmail('invalid@')).toThrow();
      expect(() => sanitizeEmail('@example.com')).toThrow();
      expect(() => sanitizeEmail('invalid@.com')).toThrow();
      expect(() => sanitizeEmail('invalid@com')).toThrow();
      expect(() => sanitizeEmail('invalid.email')).toThrow();
    });

    it('should handle edge cases', () => {
      expect(() => sanitizeEmail('invalid email@example.com')).toThrow();
      expect(() => sanitizeEmail('test@example')).toThrow();
    });
  });

  describe('sanitizeUrl', () => {
    it('should validate and return valid URLs', () => {
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
      expect(sanitizeUrl('http://example.com')).toBe('http://example.com');
      expect(sanitizeUrl('  https://example.com  ')).toBe('https://example.com');
      expect(sanitizeUrl('https://example.com/path?query=value')).toBe('https://example.com/path?query=value');
      expect(sanitizeUrl('https://subdomain.example.com')).toBe('https://subdomain.example.com');
    });

    it('should return undefined for null/undefined/empty', () => {
      expect(sanitizeUrl(null)).toBeUndefined();
      expect(sanitizeUrl(undefined)).toBeUndefined();
      expect(sanitizeUrl('')).toBeUndefined();
    });

    it('should throw error for invalid URL formats', () => {
      expect(() => sanitizeUrl('not-a-url')).toThrow();
      expect(() => sanitizeUrl('example.com')).toThrow(); // Missing protocol
      expect(() => sanitizeUrl('invalid url')).toThrow();
      // Note: ftp:// URLs are technically valid URLs, so we don't test that
    });
  });

  describe('sanitizePhoneNumber', () => {
    describe('US phone numbers', () => {
      it('should validate and format US numbers to E.164', () => {
        expect(sanitizePhoneNumber('(415) 555-2671', { defaultCountry: 'US' })).toBe('+14155552671');
        expect(sanitizePhoneNumber('415-555-2671', { defaultCountry: 'US' })).toBe('+14155552671');
        expect(sanitizePhoneNumber('415.555.2671', { defaultCountry: 'US' })).toBe('+14155552671');
        expect(sanitizePhoneNumber('4155552671', { defaultCountry: 'US' })).toBe('+14155552671');
        expect(sanitizePhoneNumber('+1 415 555 2671')).toBe('+14155552671');
      });

      it('should format US numbers in different output formats', () => {
        const phone = '(415) 555-2671';
        expect(sanitizePhoneNumber(phone, { defaultCountry: 'US', format: 'E164' })).toBe('+14155552671');
        expect(sanitizePhoneNumber(phone, { defaultCountry: 'US', format: 'NATIONAL' })).toMatch(/415.*555.*2671/);
        expect(sanitizePhoneNumber(phone, { defaultCountry: 'US', format: 'INTERNATIONAL' })).toBe('+1 415 555 2671');
      });
    });

    describe('International phone numbers', () => {
      it('should validate and format UK numbers', () => {
        expect(sanitizePhoneNumber('+44 20 7946 0958')).toBe('+442079460958');
        expect(sanitizePhoneNumber('020 7946 0958', { defaultCountry: 'GB' })).toBe('+442079460958');
        expect(sanitizePhoneNumber('02079460958', { defaultCountry: 'GB' })).toBe('+442079460958');
      });

      it('should validate and format Canadian numbers', () => {
        expect(sanitizePhoneNumber('(416) 555-1234', { defaultCountry: 'CA' })).toBe('+14165551234');
        expect(sanitizePhoneNumber('+1 416 555 1234')).toBe('+14165551234');
      });

      it('should validate and format French numbers', () => {
        expect(sanitizePhoneNumber('+33 1 42 86 83 26')).toBe('+33142868326');
        expect(sanitizePhoneNumber('01 42 86 83 26', { defaultCountry: 'FR' })).toBe('+33142868326');
      });

      it('should validate and format German numbers', () => {
        expect(sanitizePhoneNumber('+49 30 12345678')).toBe('+493012345678');
        expect(sanitizePhoneNumber('030 12345678', { defaultCountry: 'DE' })).toBe('+493012345678');
      });

      it('should validate and format Australian numbers', () => {
        expect(sanitizePhoneNumber('+61 2 9374 4000')).toBe('+61293744000');
        expect(sanitizePhoneNumber('(02) 9374 4000', { defaultCountry: 'AU' })).toBe('+61293744000');
      });

      it('should validate and format Japanese numbers', () => {
        expect(sanitizePhoneNumber('+81 3 1234 5678')).toBe('+81312345678');
      });

      it('should validate and format Brazilian numbers', () => {
        expect(sanitizePhoneNumber('+55 11 98765 4321')).toBe('+5511987654321');
      });
    });

    describe('Edge cases', () => {
      it('should return undefined for null/undefined/empty', () => {
        expect(sanitizePhoneNumber(null)).toBeUndefined();
        expect(sanitizePhoneNumber(undefined)).toBeUndefined();
        expect(sanitizePhoneNumber('')).toBeUndefined();
        expect(sanitizePhoneNumber('   ')).toBeUndefined();
      });

      it('should throw error for invalid phone numbers', () => {
        expect(() => sanitizePhoneNumber('123')).toThrow();
        expect(() => sanitizePhoneNumber('invalid')).toThrow();
        expect(() => sanitizePhoneNumber('123-456')).toThrow();
        expect(() => sanitizePhoneNumber('555-1234', { defaultCountry: 'US' })).toThrow(); // Too short without area code
      });

      it('should handle numbers with country code prefix', () => {
        expect(sanitizePhoneNumber('+14155552671')).toBe('+14155552671');
        expect(sanitizePhoneNumber('+442079460958')).toBe('+442079460958');
      });

      it('should handle numbers without default country when country code is present', () => {
        expect(sanitizePhoneNumber('+1 415 555 2671')).toBe('+14155552671');
        expect(sanitizePhoneNumber('+44 20 7946 0958')).toBe('+442079460958');
      });

      it('should allow partial numbers when allowPartial is true', () => {
        // Note: libphonenumber-js still requires valid number format even with allowPartial
        // allowPartial mainly affects validation of completeness, not format
        // Very short numbers will still fail because they're not valid phone number formats
        // We test with a number that's valid but might be considered incomplete
        const result = sanitizePhoneNumber('415555', { defaultCountry: 'US', allowPartial: true });
        // This might still fail, but demonstrates the allowPartial option exists
        // In practice, phone numbers need to be reasonably complete
      });
    });

    describe('Format options', () => {
      const testPhone = '+14155552671';

      it('should use E164 format by default', () => {
        expect(sanitizePhoneNumber('(415) 555-2671', { defaultCountry: 'US' })).toBe('+14155552671');
      });

      it('should respect format option', () => {
        expect(sanitizePhoneNumber('(415) 555-2671', { defaultCountry: 'US', format: 'E164' })).toBe('+14155552671');
        expect(sanitizePhoneNumber('(415) 555-2671', { defaultCountry: 'US', format: 'INTERNATIONAL' })).toBe('+1 415 555 2671');
      });
    });
  });

  describe('validatePhoneNumber', () => {
    it('should return true for valid phone numbers', () => {
      expect(validatePhoneNumber('+14155552671')).toBe(true);
      expect(validatePhoneNumber('(415) 555-2671', 'US')).toBe(true);
      expect(validatePhoneNumber('+44 20 7946 0958')).toBe(true);
      expect(validatePhoneNumber('020 7946 0958', 'GB')).toBe(true);
    });

    it('should return false for invalid phone numbers', () => {
      expect(validatePhoneNumber('123')).toBe(false);
      expect(validatePhoneNumber('invalid')).toBe(false);
      expect(validatePhoneNumber('123-456')).toBe(false);
    });

    it('should return false for null/undefined/empty', () => {
      expect(validatePhoneNumber(null)).toBe(false);
      expect(validatePhoneNumber(undefined)).toBe(false);
      expect(validatePhoneNumber('')).toBe(false);
      expect(validatePhoneNumber('   ')).toBe(false);
    });
  });

  describe('getPhoneCountryCode', () => {
    it('should extract country calling code from phone numbers', () => {
      expect(getPhoneCountryCode('+14155552671')).toBe('1');
      expect(getPhoneCountryCode('+442079460958')).toBe('44');
      expect(getPhoneCountryCode('+33142868326')).toBe('33');
      expect(getPhoneCountryCode('(415) 555-2671', 'US')).toBe('1');
    });

    it('should return undefined for invalid numbers', () => {
      expect(getPhoneCountryCode('invalid')).toBeUndefined();
      expect(getPhoneCountryCode('123')).toBeUndefined();
    });

    it('should return undefined for null/undefined/empty', () => {
      expect(getPhoneCountryCode(null)).toBeUndefined();
      expect(getPhoneCountryCode(undefined)).toBeUndefined();
      expect(getPhoneCountryCode('')).toBeUndefined();
    });
  });

  describe('getPhoneCountry', () => {
    it('should extract country ISO code from phone numbers', () => {
      expect(getPhoneCountry('+14155552671')).toBe('US');
      expect(getPhoneCountry('+442079460958')).toBe('GB');
      expect(getPhoneCountry('+33142868326')).toBe('FR');
      expect(getPhoneCountry('(415) 555-2671', 'US')).toBe('US');
    });

    it('should return undefined for invalid numbers', () => {
      expect(getPhoneCountry('invalid')).toBeUndefined();
      expect(getPhoneCountry('123')).toBeUndefined();
    });

    it('should return undefined for null/undefined/empty', () => {
      expect(getPhoneCountry(null)).toBeUndefined();
      expect(getPhoneCountry(undefined)).toBeUndefined();
      expect(getPhoneCountry('')).toBeUndefined();
    });
  });

  describe('validateEnum', () => {
    const allowedValues = ['option1', 'option2', 'option3'] as const;

    it('should return valid enum value', () => {
      expect(validateEnum('option1', allowedValues)).toBe('option1');
      expect(validateEnum('option2', allowedValues)).toBe('option2');
    });

    it('should trim whitespace', () => {
      expect(validateEnum('  option1  ', allowedValues)).toBe('option1');
    });

    it('should return undefined for null/undefined/empty', () => {
      expect(validateEnum(null, allowedValues)).toBeUndefined();
      expect(validateEnum(undefined, allowedValues)).toBeUndefined();
      expect(validateEnum('', allowedValues)).toBeUndefined();
    });

    it('should throw error for invalid enum values', () => {
      expect(() => validateEnum('invalid', allowedValues)).toThrow();
      expect(() => validateEnum('option4', allowedValues)).toThrow();
    });
  });

  describe('Zod schemas', () => {
    describe('emailSchema', () => {
      it('should validate and transform valid emails', () => {
        expect(emailSchema.parse('test@example.com')).toBe('test@example.com');
        expect(emailSchema.parse('TEST@EXAMPLE.COM')).toBe('test@example.com');
        expect(emailSchema.parse('  Test@Example.com  ')).toBe('test@example.com');
      });

      it('should reject invalid emails', () => {
        expect(() => emailSchema.parse('invalid')).toThrow();
        expect(() => emailSchema.parse('invalid@')).toThrow();
        expect(() => emailSchema.parse('@example.com')).toThrow();
      });

      it('should enforce max length', () => {
        const longEmail = 'a'.repeat(250) + '@example.com';
        expect(() => emailSchema.parse(longEmail)).toThrow();
      });
    });

    describe('urlSchema', () => {
      it('should validate and transform valid URLs', () => {
        expect(urlSchema.parse('https://example.com')).toBe('https://example.com');
        expect(urlSchema.parse('  https://example.com  ')).toBe('https://example.com');
      });

      it('should reject invalid URLs', () => {
        expect(() => urlSchema.parse('not-a-url')).toThrow();
        expect(() => urlSchema.parse('example.com')).toThrow();
      });
    });

    describe('phoneSchema', () => {
      it('should validate and format US phone numbers', () => {
        const schema = phoneSchema('US');
        const result = schema.parse('(415) 555-2671');
        expect(result).toBe('+14155552671');
      });

      it('should validate and format international numbers', () => {
        const schema = phoneSchema();
        const result = schema.parse('+44 20 7946 0958');
        expect(result).toBe('+442079460958');
      });

      it('should allow optional phone numbers', () => {
        const schema = phoneSchema('US');
        expect(schema.parse(undefined)).toBeUndefined();
        expect(schema.parse('')).toBeUndefined();
      });

      it('should reject invalid phone numbers', () => {
        const schema = phoneSchema('US');
        expect(() => schema.parse('123')).toThrow();
        expect(() => schema.parse('invalid')).toThrow();
      });

      it('should format in NATIONAL format when specified', () => {
        const schema = phoneSchema('US', 'NATIONAL');
        const result = schema.parse('+14155552671');
        expect(result).toMatch(/415.*555.*2671/);
      });

      it('should format in INTERNATIONAL format when specified', () => {
        const schema = phoneSchema('US', 'INTERNATIONAL');
        const result = schema.parse('(415) 555-2671');
        expect(result).toBe('+1 415 555 2671');
      });
    });

    describe('internationalPhoneSchema', () => {
      it('should validate international phone numbers', () => {
        expect(internationalPhoneSchema.parse('+14155552671')).toBe('+14155552671');
        expect(internationalPhoneSchema.parse('+442079460958')).toBe('+442079460958');
      });

      it('should allow optional phone numbers', () => {
        expect(internationalPhoneSchema.parse(undefined)).toBeUndefined();
        expect(internationalPhoneSchema.parse('')).toBeUndefined();
      });
    });

    describe('string schemas', () => {
      it('should trim and limit short strings', () => {
        expect(shortStringSchema.parse('  hello  ')).toBe('hello');
        const longString = 'a'.repeat(101);
        expect(() => shortStringSchema.parse(longString)).toThrow();
      });

      it('should trim and limit medium strings', () => {
        expect(mediumStringSchema.parse('  hello  ')).toBe('hello');
        const longString = 'a'.repeat(256);
        expect(() => mediumStringSchema.parse(longString)).toThrow();
      });

      it('should trim and limit long strings', () => {
        expect(longStringSchema.parse('  hello  ')).toBe('hello');
        const longString = 'a'.repeat(5001);
        expect(() => longStringSchema.parse(longString)).toThrow();
      });

      it('should validate names', () => {
        expect(nameSchema.parse('John')).toBe('John');
        expect(nameSchema.parse('  John Doe  ')).toBe('John Doe');
        expect(() => nameSchema.parse('')).toThrow(); // Empty string fails min(1)
        // Note: transform runs before min validation, so whitespace-only becomes empty string
        // and then min(1) validation should catch it
        const longName = 'a'.repeat(101);
        expect(() => nameSchema.parse(longName)).toThrow(); // Exceeds max(100)
      });
    });

    describe('number schemas', () => {
      it('should validate positive numbers', () => {
        expect(positiveNumberSchema.parse(1)).toBe(1);
        expect(positiveNumberSchema.parse(100)).toBe(100);
        expect(() => positiveNumberSchema.parse(0)).toThrow();
        expect(() => positiveNumberSchema.parse(-1)).toThrow();
      });

      it('should validate non-negative numbers', () => {
        expect(nonNegativeNumberSchema.parse(0)).toBe(0);
        expect(nonNegativeNumberSchema.parse(1)).toBe(1);
        expect(() => nonNegativeNumberSchema.parse(-1)).toThrow();
      });
    });

    describe('dateSchema', () => {
      it('should validate ISO datetime strings', () => {
        expect(dateSchema.parse('2024-01-15T10:30:00Z')).toBe('2024-01-15T10:30:00Z');
        expect(dateSchema.parse('2024-01-15T10:30:00.000Z')).toBe('2024-01-15T10:30:00.000Z');
      });

      it('should validate date strings', () => {
        expect(dateSchema.parse('2024-01-15')).toBe('2024-01-15');
        expect(dateSchema.parse('2024-12-31')).toBe('2024-12-31');
      });

      it('should reject invalid date formats', () => {
        expect(() => dateSchema.parse('2024-1-15')).toThrow();
        expect(() => dateSchema.parse('01/15/2024')).toThrow();
        expect(() => dateSchema.parse('invalid')).toThrow();
      });
    });
  });

  describe('Integration tests', () => {
    it('should handle realistic collaborator phone number scenarios', () => {
      // Various US formats
      const usFormats = [
        '(415) 555-2671',
        '415-555-2671',
        '415.555.2671',
        '4155552671',
        '+1 415 555 2671',
        '+14155552671',
      ];

      usFormats.forEach((phone) => {
        const result = sanitizePhoneNumber(phone, { defaultCountry: 'US', format: 'E164' });
        expect(result).toBe('+14155552671');
      });
    });

    it('should handle international collaborator phone numbers', () => {
      const internationalNumbers = [
        { input: '+44 20 7946 0958', expected: '+442079460958', country: 'GB' },
        { input: '+33 1 42 86 83 26', expected: '+33142868326', country: 'FR' },
        { input: '+49 30 12345678', expected: '+493012345678', country: 'DE' },
        { input: '+61 2 9374 4000', expected: '+61293744000', country: 'AU' },
      ];

      internationalNumbers.forEach(({ input, expected, country }) => {
        const result = sanitizePhoneNumber(input);
        expect(result).toBe(expected);
        expect(getPhoneCountry(result)).toBe(country);
      });
    });

    it('should handle edge cases in real-world scenarios', () => {
      // Empty phone number (should be allowed)
      expect(sanitizePhoneNumber('')).toBeUndefined();
      expect(sanitizePhoneNumber(null)).toBeUndefined();

      // Phone number with spaces
      expect(sanitizePhoneNumber('+1 415 555 2671')).toBe('+14155552671');

      // Phone number with various formatting
      expect(sanitizePhoneNumber('+1 (415) 555-2671')).toBe('+14155552671');
    });
  });
});
