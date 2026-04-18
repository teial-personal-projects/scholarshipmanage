# Scholarship Hub - Technical Design Document

**Version:** 1.0  
**Date:** 2024  
**Status:** Approved

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Frontend Architecture](#4-frontend-architecture)
5. [Backend Architecture](#5-backend-architecture)
6. [Database Design](#6-database-design)
7. [API Design](#7-api-design)
8. [Security Implementation](#8-security-implementation)
9. [Testing Strategy](#9-testing-strategy)
10. [Deployment Configuration](#10-deployment-configuration)

---

## 1. Introduction

### 1.1 Purpose

This Technical Design Document (TDD) describes the implementation details and technical approaches for the Scholarship Hub application. It explains **how** the system is implemented and **why** specific technical solutions were chosen.

**Audience:** Implementing engineers, code reviewers, maintainers

### 1.2 Scope

This document covers:
- Detailed technical specifications and implementation approaches
- Technology stack and library choices
- Code organization and project structure
- API endpoint specifications
- Database schema and relationships
- Security implementation details
- Testing strategies
- Deployment procedures

**Out of Scope:**
- High-level architectural decisions (see System Design Document)
- Business requirements and use cases
- User interface design specifications

### 1.3 Document Relationship

This TDD complements:
- **System Design Document (SDD)**: High-level architectural decisions and rationale
- **Database Schema Documentation**: Detailed database structure
- **API Documentation**: Endpoint specifications (may be auto-generated from code)

---

## 2. Tech Stack

### 2.1 Frontend Technologies

#### Core Framework
- **React 18**: Declarative UI library for building component-based user interfaces
- **TypeScript**: Adds static typing to JavaScript to catch errors at compile time
- **Vite**: Fast build tool and dev server with instant Hot Module Replacement

#### Routing
- **React Router DOM**: Enables client-side routing and navigation without page reloads

#### UI Library
- **Chakra UI**: Pre-built, accessible React components with consistent styling

#### State Management & Data Fetching
- **TanStack Query (React Query)**: Manages server state with automatic caching, refetching, and loading/error states
- **React Context**: Built-in React feature for sharing state across components without prop drilling

#### HTTP Client
- **Axios**: Promise-based HTTP client with request/response interceptors for API calls

#### Build Tools
- **Vite**: Bundles and optimizes code for production with fast development experience
- **TypeScript Compiler**: Transpiles TypeScript to JavaScript and performs type checking

### 2.2 Backend Technologies

#### Runtime & Framework
- **Node.js 24.12+**: JavaScript runtime that executes server-side code
- **Express**: Minimal web framework for building HTTP servers and REST APIs
- **TypeScript**: Adds type safety to Node.js code for better maintainability

#### Database & Authentication
- **Supabase**: Managed PostgreSQL database with built-in authentication, RLS policies, and client SDK

#### Validation & Sanitization
- **Zod**: Runtime schema validation library that validates and infers TypeScript types
- **DOMPurify (isomorphic-dompurify)**: Removes malicious HTML/JavaScript to prevent XSS attacks

#### Security
- **Helmet.js**: Sets security HTTP headers (CSP, HSTS, etc.) to protect against common attacks
- **express-rate-limit**: Prevents abuse by limiting the number of requests per IP/endpoint

#### Testing
- **Vitest**: Fast, Vite-native testing framework with TypeScript support
- **Supertest**: Makes HTTP assertions to test Express routes and middleware

### 2.3 Shared Package

- **TypeScript**: Defines shared type definitions used by both frontend and backend
- **Zod**: Provides validation schemas that can be used on both client and server

### 2.4 Development Tools

- **NPM Workspaces**: Manages multiple packages in a single repository with shared dependencies
- **ESLint**: Analyzes code for potential errors and enforces coding standards
- **Prettier**: Automatically formats code for consistent style

### 2.5 Infrastructure

- **Railway**: Backend hosting platform
- **Cloudflare Pages**: Frontend hosting platform
- **Supabase**: Database and authentication hosting

---

## 3. Project Structure

### 3.1 Monorepo Organization

```
scholarship-hub/
├── package.json                 # Root workspace config
├── .env.local                  # Local environment variables
├── .gitignore
│
├── web/                        # React frontend
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── index.html
│   └── src/
│       ├── components/         # Reusable UI components
│       ├── pages/              # Page components (routes)
│       ├── contexts/           # React contexts
│       │   └── AuthContext.tsx
│       ├── services/           # API client
│       │   └── api.ts
│       ├── hooks/              # Custom React hooks
│       ├── utils/              # Frontend utilities
│       ├── config/             # Configuration
│       │   └── supabase.ts
│       └── test/               # Test utilities and fixtures
│
├── api/                        # Node.js backend
│   ├── package.json
│   ├── tsconfig.json
│   ├── vitest.config.ts
│   └── src/
│       ├── index.ts            # Express server entry point
│       ├── config/             # Configuration
│       │   ├── index.ts        # Environment config
│       │   └── supabase.ts     # Supabase client
│       ├── routes/             # Express routes
│       │   ├── index.ts        # Route aggregator
│       │   ├── auth.routes.ts
│       │   ├── users.routes.ts
│       │   ├── applications.routes.ts
│       │   └── ...
│       ├── controllers/        # Request handlers
│       │   ├── auth.controller.ts
│       │   ├── users.controller.ts
│       │   └── ...
│       ├── services/           # Business logic
│       │   ├── users.service.ts
│       │   ├── applications.service.ts
│       │   └── ...
│       ├── middleware/         # Express middleware
│       │   ├── auth.ts         # Authentication middleware
│       │   ├── role.ts         # Role-based access control
│       │   ├── validate.ts     # Input validation
│       │   └── error-handler.ts
│       ├── schemas/            # Zod validation schemas
│       │   ├── common.ts
│       │   ├── users.schemas.ts
│       │   └── ...
│       ├── migrations/         # Database migrations
│       │   ├── 001_users_profiles.sql
│       │   ├── 002_applications.sql
│       │   └── ...
│       ├── utils/              # Backend utilities
│       │   └── sanitize-html.ts
│       └── test/               # Test utilities and fixtures
│
└── shared/                     # Shared TypeScript types
    ├── package.json
    ├── tsconfig.json
    └── src/
        ├── index.ts
        └── types/
            ├── api-responses.types.ts
            ├── user.types.ts
            └── ...
```

### 3.2 Package Dependencies

**Root Workspace:**
- Defines workspace packages: `web`, `api`, `shared`
- Contains shared scripts and configuration

**Web Package:**
- React and React DOM
- React Router DOM
- Chakra UI
- TanStack Query
- Axios
- Vite and plugins

**API Package:**
- Express
- Supabase client
- Zod
- DOMPurify (isomorphic-dompurify)
- Helmet.js
- express-rate-limit
- Vitest and testing utilities

**Shared Package:**
- TypeScript types only (no runtime dependencies)
- Zod schemas (shared validation)

---

## 4. Frontend Architecture

### 4.1 Routing Structure

Routes are defined in `web/src/App.tsx`:

**Public Routes:**
- `/login` - User login page
- `/register` - User registration page
- `/forgot-password` - Password reset request page
- `/reset-password` - Password reset form page
- `/invite/:token` - Collaborator invitation acceptance page

**Protected Routes (require authentication):**
- `/dashboard` - Main dashboard (students)
- `/applications` - List of applications
- `/applications/new` - Create new application
- `/applications/:id` - View application details
- `/applications/:id/edit` - Edit application
- `/collaborators` - Manage collaborators
- `/collaborator/dashboard` - Collaborator-specific dashboard
- `/profile` - User profile settings

**Root Route:**
- `/` - Redirects to `/dashboard` (if authenticated) or `/login`

### 4.2 State Management

#### Authentication State
- **React Context** (`AuthContext`): Manages user authentication state
  - Stores current user session
  - Provides login/logout functions
  - Syncs with Supabase Auth

#### Server State
- **TanStack Query**: Manages all API data
  - Automatic caching and background refetching
  - Loading and error states
  - Optimistic updates for mutations
  - Query invalidation for cache updates

#### Local State
- **React useState**: Component-specific state
  - Form inputs
  - UI state (modals, dropdowns, etc.)
  - Component-level interactions

### 4.3 Component Architecture

#### Component Hierarchy

The application structure follows this hierarchy:
- **App.tsx** (root component)
  - **AuthContext.Provider** (authentication context)
  - **Router** (routing component)
    - **ProtectedRoute** (route wrapper for authenticated routes)
      - **Dashboard** (main dashboard page)
        - **Navigation** (top navigation bar)
        - **DashboardReminders** (reminders widget)
    - **Applications** (applications page)
      - **ApplicationList** (list of applications)
        - **ApplicationCard** (individual application card)
      - **ApplicationForm** (create/edit form)

#### Component Types

**Pages** (`pages/`):
- Route-level components
- Compose multiple components
- Handle route-specific logic

**Components** (`components/`):
- Reusable UI components
- Presentational components (receive props, render UI)
- Container components (manage state, fetch data)

**Contexts** (`contexts/`):
- Global state providers
- Authentication context

**Hooks** (`hooks/`):
- Custom React hooks
- Reusable logic (e.g., `useAuth`, `useApplications`)

### 4.4 API Client Implementation

**Location**: `web/src/services/api.ts`

**Features**:
- Axios instance with base URL configuration
- Request interceptors: Adds JWT token to Authorization header
- Response interceptors: Handles 401 errors, attempts token refresh
- Error handling: Transforms API errors into typed exceptions
- TypeScript types: Uses shared types from `@scholarship-hub/shared`

**Token Refresh Flow**:
1. API request returns 401 (unauthorized)
2. Interceptor calls `refreshAccessToken()`
3. Supabase refreshes the session
4. Request is retried with new token
5. If refresh fails, user is redirected to login

### 4.5 Key Components

#### Navigation
- Top navigation bar with user menu
- Protected route navigation
- Logout functionality

#### ProtectedRoute
- Route guard component
- Checks authentication state
- Redirects to login if not authenticated

#### ApplicationForm
- Form for creating/editing applications
- Uses React Hook Form (if implemented) or controlled inputs
- Validation with Zod schemas
- Error display for validation errors

#### DashboardReminders
- Displays upcoming deadline reminders
- Fetches reminders via TanStack Query
- Updates in real-time (via query refetching)

---

## 5. Backend Architecture

### 5.1 Layered Architecture

The backend follows a layered architecture pattern with the following layers (from top to bottom):

1. **Routes Layer**: Defines HTTP endpoints and maps URLs to controllers
2. **Middleware Layer**: Processes requests (authentication, validation, rate limiting)
3. **Controllers Layer**: Handles HTTP requests and responses
4. **Services Layer**: Contains business logic
5. **Database Layer**: Supabase/PostgreSQL for data persistence

Requests flow downward through these layers, and responses flow back up.

### 5.2 Request Flow

**Typical Request Flow:**

1. **HTTP Request** arrives at Express server
2. **Route Handler** (`routes/*.routes.ts`) matches URL and HTTP method
3. **Middleware Chain** executes:
   - `generalApiLimiter` - Rate limiting (all routes)
   - `auth` middleware - Verifies JWT token (protected routes)
   - `requireRole` middleware - Checks user role (role-specific routes)
   - `validateBody` / `validateParams` / `validateQuery` - Input validation
4. **Controller** (`controllers/*.controller.ts`) receives request
   - Extracts parameters from request
   - Calls appropriate service method
   - Formats response and sends to client
5. **Service** (`services/*.service.ts`) executes business logic
   - Validates business rules
   - Queries database via Supabase client
   - Processes data
   - Returns result to controller
6. **Database** (Supabase/PostgreSQL) executes query
   - RLS policies enforce data access
   - Returns data to service
7. **Response** flows back through layers to client

### 5.3 Middleware Implementation

#### Authentication Middleware (`middleware/auth.ts`)

**Function**: Verifies JWT token from Authorization header

**Process**:
1. Extracts token from `req.headers.authorization` (Bearer token format)
2. Uses Supabase `getUser()` to verify token
3. Attaches user object to `req.user`
4. Calls `next()` if valid, returns 401 if invalid

**Usage**: Applied to routes via `router.get()` with `auth` middleware

#### Role Middleware (`middleware/role.ts`)

**Function**: Enforces role-based access control

**Process**:
1. Checks `req.user.roles` array
2. Verifies user has required role
3. Calls `next()` if authorized, returns 403 if not

**Usage**: Applied to routes via `router.post()` with `auth` and `requireRole()` middleware

#### Validation Middleware (`middleware/validate.ts`)

**Functions**:
- `validateBody(schema)`: Validates request body
- `validateParams(schema)`: Validates path parameters
- `validateQuery(schema)`: Validates query parameters

**Process**:
1. Uses Zod `safeParseAsync()` for validation
2. Returns 400 with validation errors if invalid
3. Calls `next()` if valid

**Usage**: Applied to routes via `router.post()` with `auth` and `validateBody()` middleware

#### Error Handler Middleware (`middleware/error-handler.ts`)

**Function**: Global error handler for unhandled errors

**Process**:
1. Catches errors from controllers/services
2. Logs error details
3. Returns appropriate HTTP status code and error message
4. Prevents sensitive error details from leaking to client

### 5.4 Service Layer Pattern

**Purpose**: Encapsulate business logic separate from HTTP concerns

**Structure**:
- One service file per domain entity (e.g., `applications.service.ts`)
- Methods correspond to business operations
- Services use Supabase client to query database
- Services return domain objects or throw errors

**Example Service Method**: `getApplicationById(userId, applicationId)` - Verifies user owns application, queries database via Supabase client, returns application or throws error if not found

### 5.5 Database Client Configuration

**Location**: `api/src/config/supabase.ts`

**Configuration**:
- Creates Supabase client with service role key for backend
- Service role key bypasses RLS (use with caution)
- Client used by services to query database
- Environment variables: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

---

## 6. Database Design

### 6.1 Schema Overview

**Core Tables:**

1. **user_profiles**: Extended user profile data
   - Links to Supabase `auth.users` via `auth_user_id`
   - Stores: name, email, phone number

2. **applications**: Scholarship applications
   - Belongs to users (via `user_id`)
   - Stores: scholarship name, deadline, status, amount, etc.

3. **essays**: Essays associated with applications
   - Belongs to applications (via `application_id`)
   - Stores: title, content, draft number, status

4. **collaborators**: User relationships for collaboration
   - Links two users (student and collaborator)
   - Stores: relationship type, contact information

5. **collaborations**: Active collaboration assignments
   - Links applications to collaborators
   - Stores: collaboration type (recommendation, essay_review), status, notes

6. **recommendations**: Recommendation letters
   - Links to collaborations and applications
   - Stores: content, status, submitted date

**Supporting Tables:**

- **reminders**: System-generated deadline reminders
- **invitations**: Collaborator invitation tokens
- **scholarship_sources**: Scholarship resource websites (for future feature)

### 6.2 Row Level Security (RLS) Policies

**Purpose**: Enforce data access control at database level

**Policy Types**:

1. **User Data Access**:
   - Users can SELECT, UPDATE, INSERT their own profile
   - Policy: `auth.uid() = auth_user_id`

2. **Application Access**:
   - Users can SELECT, UPDATE, INSERT, DELETE their own applications
   - Policy: `auth.uid() = (SELECT auth_user_id FROM user_profiles WHERE id = applications.user_id)`

3. **Collaboration Access**:
   - Users can SELECT collaborations where they are student or collaborator
   - Policy: `auth.uid() IN (SELECT auth_user_id FROM user_profiles WHERE id IN (collaborations.student_id, collaborations.collaborator_id))`

**Implementation**: RLS policies defined in database migrations (SQL)

### 6.3 Database Migrations

**Location**: `api/src/migrations/`

**Migration Files**:
- `001_users_profiles.sql`: User profiles table and RLS policies
- `002_applications.sql`: Applications table and relationships
- `003_essays.sql`: Essays table and relationships
- `004_collaborators.sql`: Collaborators and collaborations tables
- `005_recommendations.sql`: Recommendations table

**Migration Process**:
1. Create migration SQL file with incremental number
2. Define tables, indexes, constraints, RLS policies
3. Run migrations against database (manual or via script)
4. Track migration status (via Supabase dashboard or migration table)

### 6.4 Indexes

**Key Indexes**:
- `user_profiles.auth_user_id`: Unique index for auth user lookup
- `user_profiles.email_address`: Unique index for email lookup
- `applications.user_id`: Index for user's applications queries
- `applications.deadline`: Index for deadline-based queries
- `collaborations.student_id`: Index for student's collaborations
- `collaborations.collaborator_id`: Index for collaborator's collaborations

---

## 7. API Design

### 7.1 API Structure

**Base URL**: `/api`

**Versioning**: Not currently versioned (may add in future)

**Response Format**: JSON

### 7.2 Authentication Endpoints

- `POST /api/auth/register` - Register new user
  - Request: `{ email, password, firstName, lastName }`
  - Response: `{ user, session }`
  
- `POST /api/auth/login` - Login user
  - Request: `{ email, password }`
  - Response: `{ user, session }`
  
- `POST /api/auth/logout` - Logout user
  - Request: `{ refreshToken }`
  - Response: `{ message: "Logged out" }`
  
- `POST /api/auth/forgot-password` - Request password reset
  - Request: `{ email }`
  - Response: `{ message: "Password reset email sent" }`
  
- `POST /api/auth/reset-password` - Reset password
  - Request: `{ token, password }`
  - Response: `{ message: "Password reset successful" }`

### 7.3 User Endpoints

- `GET /api/users/me` - Get current user profile
  - Auth: Required
  - Response: User profile object
  
- `PATCH /api/users/me` - Update current user profile
  - Auth: Required
  - Request: Partial user profile object
  - Response: Updated user profile
  
- `GET /api/users/me/roles` - Get user roles
  - Auth: Required
  - Response: `{ roles: string[] }`
  
- `GET /api/users/me/reminders` - Get user reminders
  - Auth: Required
  - Role: `student`
  - Response: Array of reminder objects

### 7.4 Application Endpoints

- `GET /api/applications` - List applications
  - Auth: Required
  - Role: `student`
  - Query params: `status`, `limit`, `offset`
  - Response: Array of application objects
  
- `POST /api/applications` - Create application
  - Auth: Required
  - Role: `student`
  - Request: Application creation object
  - Response: Created application object
  
- `GET /api/applications/:id` - Get application details
  - Auth: Required
  - Response: Application object with related data
  
- `PATCH /api/applications/:id` - Update application
  - Auth: Required
  - Request: Partial application object
  - Response: Updated application object
  
- `DELETE /api/applications/:id` - Delete application
  - Auth: Required
  - Response: `{ message: "Application deleted" }`

### 7.5 Collaborator Endpoints

- `GET /api/collaborators` - List collaborators
  - Auth: Required
  - Response: Array of collaborator objects
  
- `POST /api/collaborators` - Add collaborator
  - Auth: Required
  - Request: Collaborator creation object
  - Response: Created collaborator object
  
- `DELETE /api/collaborators/:id` - Remove collaborator
  - Auth: Required
  - Response: `{ message: "Collaborator removed" }`

### 7.6 Collaboration Endpoints

- `GET /api/collaborations` - List collaborations
  - Auth: Required
  - Query params: `status`, `type`
  - Response: Array of collaboration objects
  
- `POST /api/collaborations` - Create collaboration
  - Auth: Required
  - Request: Collaboration creation object
  - Response: Created collaboration object
  
- `GET /api/collaborations/:id` - Get collaboration details
  - Auth: Required
  - Response: Collaboration object with related data
  
- `PATCH /api/collaborations/:id` - Update collaboration
  - Auth: Required
  - Request: Partial collaboration object
  - Response: Updated collaboration object

### 7.7 Essay Endpoints

- `GET /api/essays` - List essays
  - Auth: Required
  - Query params: `applicationId`
  - Response: Array of essay objects
  
- `POST /api/essays` - Create essay
  - Auth: Required
  - Request: Essay creation object
  - Response: Created essay object
  
- `GET /api/essays/:id` - Get essay details
  - Auth: Required
  - Response: Essay object
  
- `PATCH /api/essays/:id` - Update essay
  - Auth: Required
  - Request: Partial essay object
  - Response: Updated essay object
  
- `DELETE /api/essays/:id` - Delete essay
  - Auth: Required
  - Response: `{ message: "Essay deleted" }`

### 7.8 Recommendation Endpoints

- `GET /api/recommendations` - List recommendations
  - Auth: Required
  - Query params: `collaborationId`, `applicationId`
  - Response: Array of recommendation objects
  
- `POST /api/recommendations` - Create recommendation
  - Auth: Required
  - Role: `recommender`
  - Request: Recommendation creation object
  - Response: Created recommendation object
  
- `GET /api/recommendations/:id` - Get recommendation details
  - Auth: Required
  - Response: Recommendation object
  
- `PATCH /api/recommendations/:id` - Update recommendation
  - Auth: Required
  - Role: `recommender`
  - Request: Partial recommendation object
  - Response: Updated recommendation object

### 7.9 Error Response Format

**Standard Error Response**:
- Structure: `{ error: { message, code, details } }`
- Contains error message, error code, and optional details object

**Validation Error Response**:
- Structure: `{ error: { message: "Validation failed", code: "VALIDATION_ERROR", details: { field: ["error messages"] } } }`
- Contains field-specific validation error messages

**Rate Limit Error Response**:
- Structure: `{ error: { message: "Too many requests", code: "RATE_LIMIT_EXCEEDED", details: { retryAfter: seconds } } }`
- Includes retry-after time in seconds

---

## 8. Security Implementation

### 8.1 Input Validation Implementation

**Library**: Zod

**Location**: `api/src/schemas/`

**Schema Structure**:
- Separate input and output schemas for each entity
- Input schemas use `.strict()` to reject unknown fields
- Output schemas may include additional computed fields

**Example Schema**: `createApplicationSchema` - Defines validation rules for application creation (scholarshipName, deadline, amount). `applicationResponseSchema` - Extends creation schema with additional fields (id, userId, createdAt, updatedAt) for API responses

**Validation Middleware**:
- `validateBody()`: Validates request body against schema
- `validateParams()`: Validates path parameters
- `validateQuery()`: Validates query parameters
- Returns 400 status with validation errors if invalid

### 8.2 HTML Sanitization Implementation

**Library**: DOMPurify (isomorphic-dompurify for server-side)

**Location**: 
- Server: `api/src/utils/sanitize-html.ts`
- Client: `web/src/utils/sanitize-html.ts`

**Sanitization Profiles**:

1. **STRICT**: Basic text formatting
   - Allowed tags: `b`, `i`, `em`, `strong`, `br`
   - Use case: Simple notes, comments

2. **BASIC**: Rich text formatting
   - Adds: `p`, `hr`, `ul`, `ol`, `li`, `a`, `h3`, `h4`, `h5`, `h6`
   - Use case: Collaboration notes, basic content

3. **EXTENDED**: Documentation formatting
   - Adds: `div`, `span`, `table`, `blockquote`, `code`, `pre`, `mark`, `small`
   - Use case: Essays, detailed documentation

**Security Features**:
- Whitelist approach (only allowed tags/attributes)
- All links automatically get `target="_blank"` and `rel="noopener noreferrer"`
- Removes scripts, event handlers, and dangerous attributes

**Usage**: Import `sanitizeNote()` from sanitize-html utility and call with user input to get sanitized HTML

### 8.3 Rate Limiting Implementation

**Library**: express-rate-limit

**Location**: `api/src/config/rate-limit.ts`

**Rate Limiter Configurations**:

**Authentication Limiters**:
- `authRateLimiters.login`: 5 requests per 15 minutes
- `authRateLimiters.register`: 3 requests per hour
- `authRateLimiters.passwordReset`: 3 requests per hour
- `authRateLimiters.emailVerify`: 5 requests per hour

**Operation Limiters**:
- `writeRateLimiters.createUpdate`: 30 requests per 15 minutes (POST/PATCH)
- `writeRateLimiters.delete`: 10 requests per 15 minutes (DELETE)
- `readRateLimiters.read`: 100 requests per 15 minutes (GET single resource)
- `readRateLimiters.list`: 50 requests per 15 minutes (GET lists)

**General Limiters**:
- `generalApiLimiter`: 150 requests per 15 minutes (baseline for all routes)
- `publicEndpointLimiter`: 60 requests per 15 minutes (health checks)
- `webhookLimiter`: 100 requests per 15 minutes (webhooks)

**Implementation Details**:
- Limiters skip automatically in test environment
- Returns 429 status with `Retry-After` header when limit exceeded
- Standardized JSON error response format
- Rate limit headers exposed to clients (`X-RateLimit-*`)

### 8.4 Security Headers Implementation

**Library**: Helmet.js

**Location**: `api/src/config/security-headers.ts`

**Headers Configured**:

1. **Content-Security-Policy (CSP)**: Restricts resource loading
   - Scripts: Same-origin only
   - Styles: Same-origin only
   - API connections: Whitelisted origins

2. **Strict-Transport-Security (HSTS)**: Forces HTTPS
   - Max age: 31536000 (1 year)
   - Include subdomains

3. **X-Frame-Options**: Prevents clickjacking
   - Value: `DENY`

4. **X-Content-Type-Options**: Prevents MIME sniffing
   - Value: `nosniff`

5. **Referrer-Policy**: Controls referrer information
   - Value: `strict-origin-when-cross-origin`

6. **Cross-Origin-Opener-Policy (COOP)**: Isolates browsing context
   - Value: `same-origin`

7. **Cross-Origin-Resource-Policy (CORP)**: Controls resource loading
   - Value: `same-origin`

8. **Permissions-Policy**: Restricts browser features
   - Disables unnecessary features (camera, microphone, etc.)

**Implementation**:
- Headers applied via Helmet middleware in `api/src/index.ts`
- Environment-aware configuration (different CSP for dev/prod)

### 8.5 JWT Token Handling

**Token Storage** (Frontend):
- Storage: `sessionStorage` (more secure than localStorage)
- Trade-off: Requires re-login on new tabs
- Location: Managed by Supabase client (`web/src/config/supabase.ts`)

**Token Refresh** (Frontend):
- Automatic refresh on 401 errors
- Promise deduplication prevents multiple simultaneous refresh attempts
- Redirects to login if refresh fails
- Implementation: `web/src/services/api.ts`

**Token Verification** (Backend):
- Extracts token from `Authorization: Bearer <token>` header
- Verifies token via Supabase `getUser()`
- Attaches user to request object
- Implementation: `api/src/middleware/auth.ts`

---

## 9. Testing Strategy

### 9.1 Testing Framework

**Backend**: Vitest
**Frontend**: Vitest (with React Testing Library, if configured)

### 9.2 Backend Testing

#### Unit Tests
- **Services**: Test business logic with mocked database
- **Utils**: Test utility functions (sanitization, validation)
- **Middleware**: Test middleware functions with mocked requests
- **Schemas**: Test Zod schemas with valid/invalid input

#### Integration Tests
- **API Endpoints**: Test full request/response cycle
  - Use test database or mocked Supabase client
  - Test authentication and authorization
  - Test validation and error handling
- **Database Operations**: Test service methods with real database queries
- **Authentication Flow**: Test login, registration, token refresh

#### Test Structure
```
api/src/test/
├── fixtures/          # Test data fixtures
├── helpers/           # Test utilities
└── routes/            # Route integration tests
    ├── auth.test.ts
    ├── users.test.ts
    └── ...
```

### 9.3 Frontend Testing

#### Component Tests
- Test component rendering
- Test user interactions
- Test component state changes
- Use React Testing Library for user-centric tests

#### Integration Tests
- Test page-level components
- Test API integration (with mocked API client)
- Test routing and navigation
- Test authentication flow

#### Test Structure
```
web/src/test/
├── fixtures/          # Test data fixtures
├── helpers/           # Test utilities (render, mocks)
└── components/        # Component tests
    └── pages/         # Page tests
```

### 9.4 Test Data Management

**Fixtures**: Reusable test data objects
**Factories**: Functions to generate test data
**Mocks**: Mocked API responses and external services

### 9.5 Security Testing

**Types of Security Tests**:
- **XSS Attempts**: Verify HTML sanitization blocks malicious scripts
- **SQL Injection**: Verify input validation prevents SQL injection
- **Authorization**: Verify users cannot access unauthorized resources
- **Rate Limiting**: Verify rate limits are enforced
- **Token Security**: Verify token expiration and refresh work correctly

---

## 10. Deployment Configuration

### 10.1 Backend Deployment (Railway)

**Platform**: Railway

**Configuration Steps**:

1. **Create Railway Project**:
   - Connect GitHub repository
   - Railway auto-detects Node.js project

2. **Configure Node.js Version**:
   - Set via `.nvmrc` file or `package.json` engines field
   - Required: Node.js 24.12+

3. **Environment Variables**:
   ```
   SUPABASE_URL=<supabase-project-url>
   SUPABASE_ANON_KEY=<supabase-anon-key>
   SUPABASE_SERVICE_ROLE_KEY=<supabase-service-role-key>
   NODE_ENV=production
   PORT=<railway-assigned-port>
   RESEND_API_KEY=<resend-api-key>
   ```

4. **Build Configuration**:
   - Build command: `cd api && npm install && npm run build`
   - Start command: `node api/dist/index.js`

5. **Health Checks**:
   - Health check path: `/api/health`
   - Timeout: 30 seconds

6. **Service Settings**:
   - Enable "Always On" plan ($5/month)
   - Set resource limits (memory, CPU)

7. **Custom Domain** (optional):
   - Configure custom domain in Railway settings
   - Update DNS records as instructed

### 10.2 Frontend Deployment (Cloudflare Pages)

**Platform**: Cloudflare Pages

**Configuration Steps**:

1. **Connect Repository**:
   - Connect GitHub repository to Cloudflare Pages

2. **Build Settings**:
   - Framework preset: Vite
   - Node version: 24.12 (or use `.nvmrc`)
   - Build command: `cd web && npm install && npm run build`
   - Build output directory: `web/dist`

3. **Environment Variables**:
   ```
   VITE_API_URL=<backend-api-url>
   VITE_SUPABASE_URL=<supabase-project-url>
   VITE_SUPABASE_ANON_KEY=<supabase-anon-key>
   ```

4. **Deploy**:
   - Cloudflare builds and deploys on git push
   - Provides temporary URL: `https://<project>.pages.dev`

5. **Custom Domain** (optional):
   - Configure custom domain in Cloudflare Pages
   - SSL certificate automatically provisioned

### 10.3 Database Deployment (Supabase)

**Platform**: Supabase (managed PostgreSQL)

**Configuration**:
- Database already hosted on Supabase
- Run migrations via Supabase SQL editor or migration scripts
- Configure RLS policies via migrations
- Set up automated backups (Supabase Pro tier)

### 10.4 Environment Variables Reference

**Backend (.env.production)**:
- `NODE_ENV=production`
- `PORT=3000`
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `RESEND_API_KEY` - Resend email service API key

**Frontend (.env.production)**:
- `VITE_API_URL` - Backend API URL
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key

### 10.5 Deployment Checklist

**Pre-Deployment**:
- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] CORS configured correctly
- [ ] Health check endpoint working
- [ ] SSL certificates active

**Post-Deployment Verification**:
- [ ] Verify all pages load correctly
- [ ] Test authentication flow (login, register, password reset)
- [ ] Test core features (applications, collaborations, essays)
- [ ] Monitor error logs
- [ ] Verify uptime monitoring (if configured)

---

## Document Control

**Version History:**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024 | Technical Lead | Initial technical design document |

**Review Status:** Approved

**Next Review Date:** To be determined based on implementation changes

---

## References

- System Design Document: `docs/scholarship_hub_system_design.md`
- Database Schema Documentation: `docs/database-schema.md`
- [Supabase Documentation](https://supabase.com/docs)
- [Express.js Documentation](https://expressjs.com/)
- [React Documentation](https://react.dev/)
- [Zod Documentation](https://zod.dev/)
- [Helmet.js Documentation](https://helmetjs.github.io/)

