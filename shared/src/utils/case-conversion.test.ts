/**
 * Tests for case conversion utilities
 */

import { describe, it, expect } from 'vitest';
import { toCamelCase, toSnakeCase, mapDbResults, mapDbResult } from './case-conversion';

describe('case-conversion utilities', () => {
  describe('toCamelCase', () => {
    it('should convert simple snake_case to camelCase', () => {
      const input = { first_name: 'John', last_name: 'Doe' };
      const expected = { firstName: 'John', lastName: 'Doe' };
      expect(toCamelCase(input)).toEqual(expected);
    });

    it('should handle nested objects', () => {
      const input = {
        user_name: 'John',
        user_profile: {
          phone_number: '123',
          email_address: 'john@example.com',
        },
      };
      const expected = {
        userName: 'John',
        userProfile: {
          phoneNumber: '123',
          emailAddress: 'john@example.com',
        },
      };
      expect(toCamelCase(input)).toEqual(expected);
    });

    it('should handle arrays of objects', () => {
      const input = [
        { first_name: 'John', last_name: 'Doe' },
        { first_name: 'Jane', last_name: 'Smith' },
      ];
      const expected = [
        { firstName: 'John', lastName: 'Doe' },
        { firstName: 'Jane', lastName: 'Smith' },
      ];
      expect(toCamelCase(input)).toEqual(expected);
    });

    it('should handle null and undefined', () => {
      expect(toCamelCase(null)).toBeNull();
      expect(toCamelCase(undefined)).toBeUndefined();
    });

    it('should handle primitive values', () => {
      expect(toCamelCase('test')).toBe('test');
      expect(toCamelCase(123)).toBe(123);
      expect(toCamelCase(true)).toBe(true);
    });

    it('should handle arrays of primitives', () => {
      const input = [1, 2, 3];
      expect(toCamelCase(input)).toEqual([1, 2, 3]);
    });

    it('should handle deeply nested structures', () => {
      const input = {
        user_data: {
          personal_info: {
            first_name: 'John',
            contact_details: {
              phone_number: '123',
            },
          },
        },
      };
      const expected = {
        userData: {
          personalInfo: {
            firstName: 'John',
            contactDetails: {
              phoneNumber: '123',
            },
          },
        },
      };
      expect(toCamelCase(input)).toEqual(expected);
    });
  });

  describe('toSnakeCase', () => {
    it('should convert simple camelCase to snake_case', () => {
      const input = { firstName: 'John', lastName: 'Doe' };
      const expected = { first_name: 'John', last_name: 'Doe' };
      expect(toSnakeCase(input)).toEqual(expected);
    });

    it('should handle nested objects', () => {
      const input = {
        userName: 'John',
        userProfile: {
          phoneNumber: '123',
          emailAddress: 'john@example.com',
        },
      };
      const expected = {
        user_name: 'John',
        user_profile: {
          phone_number: '123',
          email_address: 'john@example.com',
        },
      };
      expect(toSnakeCase(input)).toEqual(expected);
    });

    it('should handle arrays of objects', () => {
      const input = [
        { firstName: 'John', lastName: 'Doe' },
        { firstName: 'Jane', lastName: 'Smith' },
      ];
      const expected = [
        { first_name: 'John', last_name: 'Doe' },
        { first_name: 'Jane', last_name: 'Smith' },
      ];
      expect(toSnakeCase(input)).toEqual(expected);
    });

    it('should handle null and undefined', () => {
      expect(toSnakeCase(null)).toBeNull();
      expect(toSnakeCase(undefined)).toBeUndefined();
    });

    it('should handle primitive values', () => {
      expect(toSnakeCase('test')).toBe('test');
      expect(toSnakeCase(123)).toBe(123);
      expect(toSnakeCase(false)).toBe(false);
    });

    it('should handle deeply nested structures', () => {
      const input = {
        userData: {
          personalInfo: {
            firstName: 'John',
            contactDetails: {
              phoneNumber: '123',
            },
          },
        },
      };
      const expected = {
        user_data: {
          personal_info: {
            first_name: 'John',
            contact_details: {
              phone_number: '123',
            },
          },
        },
      };
      expect(toSnakeCase(input)).toEqual(expected);
    });
  });

  describe('mapDbResults', () => {
    it('should convert array of database rows to camelCase', () => {
      const input = [
        { user_id: 1, first_name: 'John', last_name: 'Doe' },
        { user_id: 2, first_name: 'Jane', last_name: 'Smith' },
      ];
      const expected = [
        { userId: 1, firstName: 'John', lastName: 'Doe' },
        { userId: 2, firstName: 'Jane', lastName: 'Smith' },
      ];
      expect(mapDbResults(input)).toEqual(expected);
    });

    it('should handle empty array', () => {
      expect(mapDbResults([])).toEqual([]);
    });
  });

  describe('mapDbResult', () => {
    it('should convert single database row to camelCase', () => {
      const input = { user_id: 1, first_name: 'John', last_name: 'Doe' };
      const expected = { userId: 1, firstName: 'John', lastName: 'Doe' };
      expect(mapDbResult(input)).toEqual(expected);
    });
  });

  describe('round-trip conversion', () => {
    it('should maintain data integrity through camelCase -> snake_case -> camelCase', () => {
      const original = {
        userId: 1,
        firstName: 'John',
        userProfile: {
          emailAddress: 'john@example.com',
          phoneNumber: '123',
        },
      };
      const snakeCase = toSnakeCase(original);
      const backToCamel = toCamelCase(snakeCase);
      expect(backToCamel).toEqual(original);
    });

    it('should maintain data integrity through snake_case -> camelCase -> snake_case', () => {
      const original = {
        user_id: 1,
        first_name: 'John',
        user_profile: {
          email_address: 'john@example.com',
          phone_number: '123',
        },
      };
      const camelCase = toCamelCase(original);
      const backToSnake = toSnakeCase(camelCase);
      expect(backToSnake).toEqual(original);
    });
  });
});
