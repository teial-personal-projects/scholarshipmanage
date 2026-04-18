# Expected JSON Format

This document shows the expected format for your MySQL JSON export files.

## File Naming

Place your JSON files in the `data/` directory with these names:
- `users.json` or `user_profiles.json`
- `recommenders.json`
- `applications.json`
- `essays.json`
- `recommendations.json`

## JSON Structure

Each file should contain an array of objects, where each object represents a row from your MySQL database.

### users.json / user_profiles.json

```json
[
  {
    "userId": 1,
    "authUserId": "uuid-here",
    "firstName": "John",
    "lastName": "Doe",
    "emailAddress": "john@example.com",
    "phoneNumber": "555-1234",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### recommenders.json

```json
[
  {
    "recommenderId": 1,
    "userId": 1,
    "firstName": "Jane",
    "lastName": "Smith",
    "emailAddress": "jane@example.com",
    "phoneNumber": "555-5678",
    "relationship": "Teacher",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

**Note**: This will be converted to the `collaborators` table.

### applications.json

```json
[
  {
    "applicationId": 1,
    "userId": 1,
    "scholarshipName": "National Merit Scholarship",
    "targetType": "Merit",
    "organization": "National Merit Scholarship Corporation",
    "orgWebsite": "https://example.com",
    "platform": "Common App",
    "applicationLink": "https://example.com/apply",
    "theme": "Academic Excellence",
    "minAward": 2500.00,
    "maxAward": 2500.00,
    "requirements": "High GPA, test scores",
    "renewable": false,
    "renewableTerms": null,
    "documentInfoLink": "https://example.com/docs",
    "currentAction": "Waiting for Recommendations",
    "status": "In Progress",
    "submissionDate": null,
    "openDate": "2024-01-01",
    "dueDate": "2024-12-31",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### essays.json

```json
[
  {
    "essayId": 1,
    "applicationId": 1,
    "theme": "Describe your academic goals",
    "units": "words",
    "essayLink": "https://docs.google.com/document/d/123",
    "wordCount": 500,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### recommendations.json

```json
[
  {
    "recommendationId": 1,
    "applicationId": 1,
    "recommenderId": 1,
    "status": "Pending",
    "submittedAt": null,
    "dueDate": "2024-12-15",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

## Column Name Variations

The conversion script handles common variations:

- `userId` or `user_id` → `user_id`
- `firstName` or `first_name` → `first_name`
- `emailAddress` or `email` → `email_address` (for users) or `email` (for collaborators)
- `createdAt` or `created_at` → `created_at`

## Date Formats

The script accepts various date formats:
- ISO 8601: `"2024-01-01T00:00:00.000Z"`
- MySQL datetime: `"2024-01-01 00:00:00"`
- Date only: `"2024-01-01"`

## Null Values

Null values are automatically handled:
- `null` in JSON → `NULL` in SQL
- Missing fields → omitted from INSERT (PostgreSQL will use defaults)

## Foreign Key Relationships

**Important**: Make sure foreign key IDs match:

- `applications.userId` must reference an existing `user_profiles.id`
- `essays.applicationId` must reference an existing `applications.id`
- `recommendations.applicationId` must reference an existing `applications.id`
- `recommendations.recommenderId` must reference an existing `collaborators.id` (after recommenders are converted)

The import script handles the correct order automatically.

