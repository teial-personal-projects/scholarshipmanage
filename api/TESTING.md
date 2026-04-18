# API Testing Guide

## Overview

The API requires authentication via Supabase JWT tokens for all protected endpoints.

For breakpoint debugging in test files, you can also:
Use the JavaScript Debug Terminal (Ctrl+Shift+P → "JavaScript Debug Terminal"), then run npm test in that terminal

Set breakpoints in your test files; they will work with these configurations

## Running the API

```bash
# From project root
npm run dev --workspace=api

# Server will start on http://localhost:3001
```

## Testing Endpoints

### Health Check (No Auth Required)

```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-11-28T..."
}
```

### Protected Endpoints (Auth Required)

All `/api/*` endpoints require a valid Supabase JWT token in the `Authorization` header.

#### Getting a Test Token

**Option 1: Use Supabase Dashboard**
1. Go to Supabase Dashboard → Authentication → Users
2. Find user: `teial.dickens@gmail.com` (auth_user_id: `fcb86d3c-aa8c-4245-931b-a584ac4afbe0`)
3. Set a password for this user (if not already set)
4. Use Supabase Auth API to get a token:

```bash
curl -X POST 'https://ljzvgcbtstxozqlvvzaf.supabase.co/auth/v1/token?grant_type=password' \
  -H 'apikey: YOUR_SUPABASE_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "teial.dickens@gmail.com",
    "password": "YOUR_PASSWORD"
  }'
```

**Option 2: Use Frontend (Once Built)**
The frontend will handle authentication and provide tokens automatically.

#### Testing with Token

Once you have a token:

```bash
# Get current user profile
curl http://localhost:3001/api/users/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Update user profile
curl -X PATCH http://localhost:3001/api/users/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Teial",
    "lastName": "Dickens",
    "phoneNumber": "555-1234"
  }'

# Get user roles
curl http://localhost:3001/api/users/me/roles \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Get search preferences
curl http://localhost:3001/api/users/me/search-preferences \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Update search preferences
curl -X PATCH http://localhost:3001/api/users/me/search-preferences \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "targetType": "Merit",
    "minAward": 1000,
    "academicLevel": "Undergraduate"
  }'
```

## Available Endpoints

### Users API

- `GET /api/users/me` - Get current user profile (includes search preferences)
- `PATCH /api/users/me` - Update current user profile
- `GET /api/users/me/roles` - Get user roles
- `GET /api/users/me/search-preferences` - Get search preferences
- `PATCH /api/users/me/search-preferences` - Update search preferences

### Essays API

- `GET /api/applications/:applicationId/essays` - List essays for an application
- `POST /api/applications/:applicationId/essays` - Create new essay
- `GET /api/essays/:id` - Get essay details
- `PATCH /api/essays/:id` - Update essay
- `DELETE /api/essays/:id` - Delete essay

#### Testing Essays Endpoints

```bash
# List all essays for an application (replace APPLICATION_ID with actual ID)
curl http://localhost:3001/api/applications/1/essays \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Create a new essay
curl -X POST http://localhost:3001/api/applications/1/essays \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "theme": "Why I deserve this scholarship",
    "units": "words",
    "essayLink": "https://docs.google.com/document/d/...",
    "wordCount": 500
  }'

# Get a specific essay
curl http://localhost:3001/api/essays/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Update an essay
curl -X PATCH http://localhost:3001/api/essays/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "theme": "Updated essay theme",
    "wordCount": 600
  }'

# Delete an essay
curl -X DELETE http://localhost:3001/api/essays/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Collaborators API

- `GET /api/collaborators` - List user's collaborators
- `POST /api/collaborators` - Add new collaborator
- `GET /api/collaborators/:id` - Get collaborator details
- `PATCH /api/collaborators/:id` - Update collaborator
- `DELETE /api/collaborators/:id` - Delete collaborator

#### Testing Collaborators Endpoints

```bash
# List all collaborators
curl http://localhost:3001/api/collaborators \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Create a new collaborator
curl -X POST http://localhost:3001/api/collaborators \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Smith",
    "emailAddress": "john.smith@example.com",
    "relationship": "Teacher",
    "phoneNumber": "555-1234"
  }'

# Get a specific collaborator
curl http://localhost:3001/api/collaborators/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Update a collaborator
curl -X PATCH http://localhost:3001/api/collaborators/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "relationship": "Counselor",
    "phoneNumber": "555-5678"
  }'

# Delete a collaborator
curl -X DELETE http://localhost:3001/api/collaborators/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Collaborations API

- `GET /api/applications/:applicationId/collaborations` - List collaborations for an application
- `POST /api/collaborations` - Create new collaboration
- `GET /api/collaborations/:id` - Get collaboration details
- `PATCH /api/collaborations/:id` - Update collaboration status/notes
- `DELETE /api/collaborations/:id` - Delete collaboration
- `POST /api/collaborations/:id/history` - Add history entry
- `GET /api/collaborations/:id/history` - Get collaboration history

#### Testing Collaborations Endpoints

```bash
# List all collaborations for an application
curl http://localhost:3001/api/applications/1/collaborations \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Create a recommendation collaboration
curl -X POST http://localhost:3001/api/collaborations \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "collaboratorId": 1,
    "applicationId": 1,
    "collaborationType": "recommendation",
    "status": "pending",
    "awaitingActionFrom": "collaborator",
    "portalUrl": "https://portal.example.com",
    "nextActionDueDate": "2024-12-31"
  }'

# Create an essay review collaboration
curl -X POST http://localhost:3001/api/collaborations \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "collaboratorId": 1,
    "applicationId": 1,
    "collaborationType": "essayReview",
    "essayId": 1,
    "status": "in_progress",
    "awaitingActionFrom": "collaborator"
  }'

# Create a guidance collaboration
curl -X POST http://localhost:3001/api/collaborations \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "collaboratorId": 1,
    "applicationId": 1,
    "collaborationType": "guidance",
    "status": "pending",
    "sessionType": "initial",
    "meetingUrl": "https://meet.example.com/room",
    "scheduledFor": "2024-12-15T10:00:00Z"
  }'

# Get a specific collaboration
curl http://localhost:3001/api/collaborations/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Update a collaboration
curl -X PATCH http://localhost:3001/api/collaborations/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "in_progress",
    "awaitingActionFrom": "student",
    "notes": "Waiting for student to provide essay draft"
  }'

# Add history entry
curl -X POST http://localhost:3001/api/collaborations/1/history \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "invited",
    "details": "Collaborator invited via email"
  }'

# Get collaboration history
curl http://localhost:3001/api/collaborations/1/history \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Delete a collaboration
curl -X DELETE http://localhost:3001/api/collaborations/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Recommendations API

- `GET /api/applications/:applicationId/recommendations` - List recommendations for an application
- `POST /api/recommendations` - Create new recommendation
- `GET /api/recommendations/:id` - Get recommendation details
- `PATCH /api/recommendations/:id` - Update recommendation status
- `DELETE /api/recommendations/:id` - Delete recommendation

#### Testing Recommendations Endpoints

```bash
# List all recommendations for an application
curl http://localhost:3001/api/applications/1/recommendations \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Create a new recommendation
curl -X POST http://localhost:3001/api/recommendations \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "applicationId": 1,
    "recommenderId": 1,
    "status": "Pending",
    "dueDate": "2024-12-31"
  }'

# Get a specific recommendation
curl http://localhost:3001/api/recommendations/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Update a recommendation
curl -X PATCH http://localhost:3001/api/recommendations/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "Submitted",
    "submittedAt": "2024-12-15T10:00:00Z"
  }'

# Delete a recommendation
curl -X DELETE http://localhost:3001/api/recommendations/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Error Responses

### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Missing or invalid authorization header"
}
```

### 404 Not Found
```json
{
  "error": "Not Found",
  "message": "The requested resource was not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal Server Error",
  "message": "Something went wrong"
}
```

## Database User Info

Current test user in database:
- **ID**: 1
- **Email**: teial.dickens@gmail.com
- **Auth User ID**: fcb86d3c-aa8c-4245-931b-a584ac4afbe0

## Notes

- All API responses use camelCase (TypeScript convention)
- Database uses snake_case (PostgreSQL convention)
- Conversion happens automatically at the API boundary
- All timestamps are in ISO 8601 format
- Protected endpoints check user ownership via RLS policies

## RLS Policy Enforcement

The API uses Supabase's service role key which bypasses Row Level Security (RLS) at the database level. However, **all service layer functions manually enforce the same ownership checks** that RLS policies would enforce:

- **Essays**: All operations verify that the essay belongs to an application owned by the authenticated user
- **Applications**: All operations verify that the application belongs to the authenticated user
- **Users**: All operations verify that the profile belongs to the authenticated user
- **Collaborators**: All operations verify that the collaborator belongs to the authenticated user
- **Collaborations**: All operations verify that the collaboration belongs to the authenticated user through the collaborator relationship
- **Recommendations**: All operations verify that the recommendation belongs to an application owned by the authenticated user

This dual-layer approach ensures security even when using the service role key. The RLS policies defined in the migrations (`003_essays.sql`, etc.) provide an additional security layer if the API were to use the anon key instead.
