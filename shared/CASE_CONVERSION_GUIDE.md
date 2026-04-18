# Case Conversion Guide

This guide explains how to convert between snake_case (database) and camelCase (TypeScript) in the ScholarshipHub application.

## Overview

- **Database columns**: Use `snake_case` (e.g., `user_id`, `first_name`, `created_at`)
- **TypeScript properties**: Use `camelCase` (e.g., `userId`, `firstName`, `createdAt`)
- **Conversion**: Use the utility functions from `@scholarship-hub/shared`

## Utility Functions

The `@scholarship-hub/shared` package provides conversion utilities:

```typescript
import { toCamelCase, toSnakeCase, mapDbResults, mapDbResult } from '@scholarship-hub/shared';
```

### `toCamelCase<T>(obj: any): T`

Converts an object's keys from snake_case to camelCase.

**Example:**
```typescript
const dbRow = {
  user_id: 1,
  first_name: 'John',
  last_name: 'Doe',
  created_at: new Date()
};

const user: User = toCamelCase<User>(dbRow);
// Result: { userId: 1, firstName: 'John', lastName: 'Doe', createdAt: Date }
```

### `toSnakeCase<T>(obj: any): T`

Converts an object's keys from camelCase to snake_case.

**Example:**
```typescript
const user: User = {
  userId: 1,
  firstName: 'John',
  lastName: 'Doe'
};

const dbData = toSnakeCase(user);
// Result: { user_id: 1, first_name: 'John', last_name: 'Doe' }
```

### `mapDbResults<T>(rows: any[]): T[]`

Type-safe wrapper for converting multiple database rows.

**Example:**
```typescript
const { data } = await supabase
  .from('users')
  .select('*');

const users: User[] = mapDbResults<User>(data);
```

### `mapDbResult<T>(row: any): T`

Type-safe wrapper for converting a single database row.

**Example:**
```typescript
const { data } = await supabase
  .from('users')
  .select('*')
  .eq('user_id', 1)
  .single();

const user: User = mapDbResult<User>(data);
```

## Usage Patterns

### Reading from Database (Supabase)

```typescript
import { supabase } from '../config/supabase';
import { mapDbResults, type User } from '@scholarship-hub/shared';

// Get all users
const { data, error } = await supabase
  .from('users')
  .select('user_id, first_name, last_name, email_address');

if (error) throw error;

// Convert to TypeScript camelCase
const users: User[] = mapDbResults<User>(data);

// Now you can use: users[0].firstName instead of users[0].first_name
```

### Writing to Database (Supabase)

```typescript
import { supabase } from '../config/supabase';
import { toSnakeCase, type User } from '@scholarship-hub/shared';

const user: Partial<User> = {
  firstName: 'Jane',
  lastName: 'Smith',
  emailAddress: 'jane@example.com'
};

// Convert to database snake_case
const dbData = toSnakeCase(user);

const { error } = await supabase
  .from('users')
  .insert(dbData);

if (error) throw error;
```

### Update Operations

```typescript
import { supabase } from '../config/supabase';
import { toSnakeCase, type User } from '@scholarship-hub/shared';

const updates: Partial<User> = {
  firstName: 'Jane',
  lastName: 'Doe'
};

// Convert to snake_case
const dbUpdates = toSnakeCase(updates);

const { error } = await supabase
  .from('users')
  .update(dbUpdates)
  .eq('user_id', userId);

if (error) throw error;
```

### Complex Queries with Joins

```typescript
import { supabase } from '../config/supabase';
import { mapDbResults, type Application } from '@scholarship-hub/shared';

const { data, error } = await supabase
  .from('applications')
  .select(`
    *,
    essays (*),
    recommendations (*)
  `)
  .eq('user_id', userId);

if (error) throw error;

// Converts all nested objects too
const applications: Application[] = mapDbResults<Application>(data);

// Access: applications[0].essays[0].wordCount (camelCase)
```

## Nested Objects

The conversion functions handle nested objects and arrays automatically:

```typescript
const dbData = {
  user_id: 1,
  first_name: 'John',
  search_preferences: {
    target_type: 'Merit',
    min_award: 1000,
    subject_areas: ['STEM', 'Engineering']
  }
};

const user = toCamelCase<User>(dbData);
// Result:
// {
//   userId: 1,
//   firstName: 'John',
//   searchPreferences: {
//     targetType: 'Merit',
//     minAward: 1000,
//     subjectAreas: ['STEM', 'Engineering']
//   }
// }
```

## Best Practices

1. **Always convert at the boundary**: Convert immediately when data enters/leaves the database layer
2. **Use type-safe wrappers**: Prefer `mapDbResults<T>()` and `mapDbResult<T>()` for better type safety
3. **Don't mix conventions**: Keep your application code in camelCase, database in snake_case
4. **Consistent conversion**: Always convert in service/repository layer, not in controllers or components

## Example Service Layer

```typescript
// users.service.ts
import { supabase } from '../config/supabase';
import { mapDbResults, mapDbResult, toSnakeCase, type User } from '@scholarship-hub/shared';

export class UsersService {
  async getAll(): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*');

    if (error) throw error;
    return mapDbResults<User>(data);
  }

  async getById(id: number): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', id)
      .single();

    if (error) return null;
    return mapDbResult<User>(data);
  }

  async create(user: Omit<User, 'userId' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const dbData = toSnakeCase(user);

    const { data, error } = await supabase
      .from('users')
      .insert(dbData)
      .select()
      .single();

    if (error) throw error;
    return mapDbResult<User>(data);
  }

  async update(id: number, updates: Partial<User>): Promise<User> {
    const dbUpdates = toSnakeCase(updates);

    const { data, error } = await supabase
      .from('users')
      .update(dbUpdates)
      .eq('user_id', id)
      .select()
      .single();

    if (error) throw error;
    return mapDbResult<User>(data);
  }
}
```

## Testing Conversion

You can test the conversion utilities:

```typescript
import { toCamelCase, toSnakeCase } from '@scholarship-hub/shared';

const snakeData = {
  user_id: 1,
  first_name: 'Test',
  created_at: new Date()
};

const camelData = toCamelCase(snakeData);
console.log(camelData);
// { userId: 1, firstName: 'Test', createdAt: Date }

const backToSnake = toSnakeCase(camelData);
console.log(backToSnake);
// { user_id: 1, first_name: 'Test', created_at: Date }
```
