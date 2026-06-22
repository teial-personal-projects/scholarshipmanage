# ScholarshipManage Technical Design

Version: 1.1

Date: 2026-06-22

Status: Current implementation snapshot

## 1. Purpose

This document describes the current ScholarshipManage implementation. It covers concrete technologies, package layout, runtime flows, routes, security controls, testing, and deployment assumptions.

Architectural rationale is covered in `docs/scholarshipmanage_system_design.md`.

## 2. Technology Stack

### 2.1 Frontend

| Area | Current implementation |
| --- | --- |
| Framework | React 18 |
| Language | TypeScript |
| Build tool | Vite 5 |
| Routing | React Router DOM 6 |
| Styling | Tailwind CSS 4 with component classes in `web/src/index.css` |
| Icons | `lucide-react` |
| Toasts | `react-hot-toast` |
| Server state | TanStack Query 5 where feature code uses query hooks |
| Auth client | `@supabase/supabase-js` browser client |
| API client | Native `fetch` wrapper in `web/src/services/api.ts` |
| HTML sanitization | DOMPurify |
| Tests | Vitest, React Testing Library, jsdom |

### 2.2 Backend

| Area | Current implementation |
| --- | --- |
| Runtime | Node.js 20 or newer |
| Framework | Express 4 |
| Language | TypeScript |
| Dev runner | `tsx watch` |
| Database and auth | Supabase PostgreSQL and Supabase Auth |
| Validation | Zod |
| Security headers | Helmet |
| Rate limiting | `express-rate-limit` |
| Email | Resend integration and webhook handling |
| Tests | Vitest and Supertest |

### 2.3 Shared Workspace

The `shared` package contains domain types, constants, validation utilities, formatting utilities, and case conversion helpers used by frontend and backend code.

## 3. Repository Structure

```text
scholarshipmanage/
├── api/
│   ├── src/
│   │   ├── config/
│   │   ├── constants/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── migrations/
│   │   ├── routes/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── test/
│   │   ├── utils/
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
├── docs/
├── scripts/
├── shared/
│   ├── src/
│   │   ├── types/
│   │   └── utils/
│   └── package.json
├── web/
│   ├── src/
│   │   ├── components/
│   │   ├── config/
│   │   ├── contexts/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── test/
│   │   └── utils/
│   ├── package.json
│   └── vite.config.ts
├── package.json
└── package-lock.json
```

## 4. Frontend Design

### 4.1 Routing

Routes are defined in `web/src/App.tsx`.

Public routes:

- `/login`
- `/register`
- `/forgot-password`
- `/reset-password`
- `/invite/:token`

Protected routes:

- `/dashboard`
- `/applications/new`
- `/applications/:id`
- `/collaborators`
- `/profile`
- `/resources`
- `/collaborator/dashboard`

Redirect behavior:

- `/` redirects to `/dashboard`.
- `/applications` redirects to `/dashboard`.

### 4.2 Authentication Context

`web/src/contexts/AuthContext.tsx` owns frontend auth state.

Responsibilities:

- Load the current Supabase session on startup.
- Subscribe to Supabase auth state changes.
- Provide `signIn`, `signUp`, `signOut`, `requestPasswordReset`, and `updatePassword`.
- Keep `user`, `session`, and `loading` available through `useAuth`.

Current flow details:

- Login uses `supabase.auth.signInWithPassword`.
- Registration posts to `/api/auth/register` with `email`, `password`, `firstName`, and `lastName`.
- Password reset request uses `supabase.auth.resetPasswordForEmail`.
- Password update uses `supabase.auth.updateUser`.

### 4.3 API Client

`web/src/services/api.ts` is the authenticated API wrapper.

Responsibilities:

- Read the current Supabase access token.
- Add `Authorization: Bearer <token>` to requests.
- Send and parse JSON.
- Refresh the Supabase session after 401 responses.
- Deduplicate concurrent refresh attempts.
- Redirect to `/login` if refresh fails.
- Convert failed responses into typed frontend API errors.

### 4.4 UI Composition

The UI uses Tailwind classes directly and shared component classes defined in `web/src/index.css`, including:

- `field-label`
- `field-input`
- `field-select`
- `field-textarea`
- `btn-primary`
- `btn-outline`
- `btn-ghost`
- `card`
- `modal-*`
- `table-*`

Primary page and feature components include:

- `Dashboard`, `DeadlineRadar`, `GridView`, `ActionFeed`, `DashboardReminders`, `DashboardCollaborations`, and `DashboardPendingResponses`.
- `ApplicationForm`, `ApplicationFormSections`, `ApplicationDetail`, and `ApplicationPanel`.
- `EssayForm`.
- `Collaborators`, `CollaboratorForm`, `AddCollaborationModal`, `EditCollaborationModal`, `AssignCollaboratorModal`, `SendInviteDialog`, and `CollaborationHistory`.
- `ScholarshipResources`.
- `Profile`.

### 4.5 Frontend Utilities

Key utility areas:

- Deadline and radar calculations: `web/src/utils/deadline*.ts`.
- Next-action and pending-work derivation: `deriveNextAction.ts`, `pendingWork.ts`, `readyToStart.ts`.
- Dashboard view persistence: `dashboardView.ts`.
- Sanitization: `sanitize-html.ts`.
- Toast helpers: `toast.ts`.
- API error parsing and rate-limit formatting: `error-handling.ts`.

## 5. Backend Design

### 5.1 Express Entry Point

`api/src/index.ts` configures:

- Helmet security headers.
- Additional security headers.
- CORS.
- Morgan request logging.
- JSON body parsing.
- `/health` with public rate limiting.
- `/api` with the general API limiter and route aggregator.
- 404 handling.
- Global error handling.

### 5.2 Route Modules

`api/src/routes/index.ts` mounts:

- `/auth`
- `/webhooks`
- `/users`
- `/applications`
- `/essays`
- `/collaborators`
- `/collaborations`
- `/recommendations`
- `/resources`

Public or non-user-authenticated routes:

- `/api/auth/*`
- `/api/webhooks/resend`

Protected routes use the `auth` middleware, and role-specific routes use `requireRole`.

### 5.3 Backend Layering

The backend follows this path:

```text
route -> middleware -> controller -> service -> Supabase
```

Routes map HTTP methods and paths. Middleware authenticates, authorizes, validates, and rate limits. Controllers translate HTTP requests into service calls. Services hold business logic and persistence behavior.

### 5.4 Middleware

Key middleware:

- `auth.ts`: Verifies Supabase JWTs and attaches the current user context.
- `role.ts`: Enforces role requirements.
- `validate.ts`: Validates request body, params, or query values with Zod.
- `error-handler.ts`: Converts operational and unexpected errors to JSON responses.

### 5.5 Services

Current domain services:

- `auth.service.ts`
- `users.service.ts`
- `applications.service.ts`
- `essays.service.ts`
- `collaborators.service.ts`
- `collaborations.service.ts`
- `recommendations.service.ts`
- `resources.service.ts`
- `reminders.service.ts`
- `email.service.ts`
- `webhooks.service.ts`

## 6. Current API Surface

### 6.1 Auth

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/api/auth/register` | Backend-owned account creation, profile creation, default `student` role assignment |
| POST | `/api/auth/login` | Backend login proxy for service scenarios |
| POST | `/api/auth/logout` | Requires bearer token |
| POST | `/api/auth/refresh` | Refreshes a session from a refresh token |

The frontend currently logs in directly through Supabase and registers through the backend endpoint.

### 6.2 Users

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/users/me` | Current user profile |
| PATCH | `/api/users/me` | Update current user profile |
| GET | `/api/users/me/roles` | Current user roles |
| GET | `/api/users/me/reminders` | Student reminders |

### 6.3 Applications

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/applications` | List student applications |
| POST | `/api/applications` | Create application |
| GET | `/api/applications/:id` | Get application detail |
| PATCH | `/api/applications/:id` | Update application |
| DELETE | `/api/applications/:id` | Delete application |
| GET | `/api/applications/:applicationId/essays` | List essays for application |
| POST | `/api/applications/:applicationId/essays` | Create essay for application |
| GET | `/api/applications/:applicationId/collaborations` | List collaborations for application |
| GET | `/api/applications/:applicationId/recommendations` | List recommendations for application |

### 6.4 Essays

The API includes a standalone `essays` route module plus nested application essay routes. Essay operations are authenticated and scoped through application ownership.

### 6.5 Collaborators

The collaborator route module supports authenticated collaborator management for students. The frontend uses it for adding and managing recommender, essay reviewer, and guidance contacts.

### 6.6 Collaborations

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/api/collaborations` | Create collaboration |
| GET | `/api/collaborations/:id` | Get collaboration |
| PATCH | `/api/collaborations/:id` | Update collaboration |
| DELETE | `/api/collaborations/:id` | Delete collaboration |
| POST | `/api/collaborations/:id/history` | Add history entry |
| GET | `/api/collaborations/:id/history` | Get history |
| POST | `/api/collaborations/:id/invite` | Send invitation now |
| POST | `/api/collaborations/:id/invite/schedule` | Schedule invitation |
| POST | `/api/collaborations/:id/invite/resend` | Resend invitation |

### 6.7 Recommendations

The recommendation route module supports recommendation retrieval and mutation. Nested application recommendation listing is also available under `/api/applications/:applicationId/recommendations`.

### 6.8 Resources

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/resources` | List enabled scholarship resources |

### 6.9 Webhooks

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/api/webhooks/resend` | Resend delivery webhook, raw JSON body for signature verification |

Reminder email delivery through a cron route is not part of the current implementation snapshot. The reminder cron job and any supporting API route are planned for v3.

## 7. Database Design

### 7.1 Core Tables

The current database is managed through SQL migrations in `api/src/migrations`.

Core areas include:

- `user_profiles` and `user_roles`.
- `applications`.
- `essays`.
- `collaborators`.
- `collaborations` and collaboration-specific detail/history tables.
- `recommendations`.
- Reminder tracking tables.
- Scholarship resource and category tables.
- Invitation and email tracking data.

### 7.2 Migration Set

Implemented migration areas include:

- User profiles.
- Applications.
- Essays.
- Collaborators.
- Recommendations.
- Collaboration invitation fields.
- Reminder tracking.
- Scholarship resource/category tables.
- Cleanup and schema simplification migrations.
- Essay review collaboration status and relationship updates.

The generated reference schema is documented separately in `docs/database-schema.md`.

### 7.3 Data Ownership

The application relies on user profile IDs for most domain ownership. Supabase Auth user IDs map to profiles through `auth_user_id`. Service methods scope reads and writes to the authenticated user's profile and role.

## 8. Security Implementation

### 8.1 Supabase Client Configuration

Frontend:

- `web/src/config/supabase.ts`
- Uses `sessionStorage`.
- Enables automatic token refresh.
- Persists sessions within the current browser session.
- Detects recovery sessions from URL redirects.

Backend:

- `api/src/config/supabase.ts`
- Uses `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
- Service-role usage means backend services must enforce user scoping explicitly.

### 8.2 Rate Limits

Configured in `api/src/config/rate-limit.ts`.
Redis is used whenever `REDIS_URL` or `REDIS_PRIVATE_URL` is set, except in test. Local development can omit Redis and use the default in-memory store. A deployed environment without Redis fails startup unless `ALLOW_IN_MEMORY_RATE_LIMIT=true` is explicitly set for an intentional single-instance deployment.

| Limiter | Current value |
| --- | --- |
| Login | 5 requests per 15 minutes |
| Registration | 3 requests per hour in production |
| Password reset | 3 requests per hour |
| Email verify | 5 requests per hour |
| Create/update | 30 requests per 15 minutes |
| Delete | 10 requests per 15 minutes |
| Read | 100 requests per 15 minutes |
| List | 50 requests per 15 minutes |
| General API | 150 requests per 15 minutes |
| Public endpoints | 60 requests per 15 minutes |
| Webhooks | 100 requests per 15 minutes |

Registration rate limiting is skipped when `NODE_ENV` is `local`, `development`, or `test`.

### 8.3 Error Responses

The global error handler returns JSON with:

- `error`
- `message`
- development-only `stack`
- development-only database details when available

`httpResponse` helpers are also used by controllers for common status responses.

### 8.4 Sanitization

Sanitization exists on both server and client:

- `api/src/utils/sanitize-html.ts`
- `web/src/utils/sanitize-html.ts`

The design uses allow-list sanitization for HTML-bearing fields.

### 8.5 Headers and CORS

Helmet and custom headers are configured through:

- `api/src/config/security-headers.ts`
- `api/src/index.ts`

CORS is configured through `api/src/config/cors.ts` and applied by `api/src/index.ts`.
The default local and development allow-list accepts:

- `https://dev.scholarshipmanage.pages.dev`
- `http://localhost:5173`

Deployments can override the allow-list with `CORS_ALLOWED_ORIGINS`, using a comma-separated list of origins.

## 9. Environment Configuration

### 9.1 Backend

Environment loading uses `.env.<NODE_ENV>` from the API process working directory. If `NODE_ENV` is unset, `local` is used.

Required backend values:

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

Common backend values:

```env
NODE_ENV=local
PORT=3001
APP_URL=http://localhost:5173
CORS_ALLOWED_ORIGINS=https://dev.scholarshipmanage.pages.dev,http://localhost:5173
REDIS_URL=
ALLOW_IN_MEMORY_RATE_LIMIT=false
RESEND_API_KEY=
RESEND_WEBHOOK_SECRET=
RESEND_FROM_EMAIL=
RESEND_FROM_NAME=
```

### 9.2 Frontend

Required frontend values:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Common frontend values:

```env
VITE_API_URL=/api
```

## 10. Testing

### 10.1 Backend Tests

Backend tests use Vitest and Supertest.

Existing test coverage includes route and service tests for:

- Auth.
- Users.
- Applications.
- Essays.
- Collaborators.
- Collaborations.
- Recommendations.

Useful commands:

```bash
npm test --workspace=@scholarshipmanage/api
npm test -- src/routes/auth.test.ts --workspace=@scholarshipmanage/api
npm run type-check --workspace=@scholarshipmanage/api
```

### 10.2 Frontend Tests

Frontend tests use Vitest with React Testing Library and jsdom.

Existing focused tests include:

- Dashboard/action feed behavior.
- Deadline radar behavior.
- Grid view behavior.
- Application panel behavior.
- View toggle behavior.
- Deadline and next-action utilities.

Useful commands:

```bash
npm test --workspace=@scholarshipmanage/web
npm run type-check --workspace=@scholarshipmanage/web
```

### 10.3 Current Lint Status

Some pre-existing frontend lint issues remain outside recent auth changes, mainly `no-explicit-any`, unused mock parameters, and React Fast Refresh warnings. Treat lint cleanup as a separate maintenance task.

## 11. Local Development

Root scripts:

```bash
npm run dev
npm run dev:web
npm run dev:api
npm run build
npm run type-check
npm run lint
```

Package-specific scripts:

```bash
npm run dev --workspace=@scholarshipmanage/web
npm run dev --workspace=@scholarshipmanage/api
```

The local API normally runs on port `3001`. The Vite frontend normally runs on port `5173`.

## 12. Deployment Notes

Current documented target platforms:

- Backend: Railway.
- Frontend: Cloudflare Pages.
- Database and Auth: Supabase.
- Email: Resend.

Production deployment must verify:

- `NODE_ENV=production`.
- Service role key is backend-only.
- Frontend uses only the Supabase anon key.
- `CORS_ALLOWED_ORIGINS` is restricted to deployed frontend origins.
- `REDIS_URL` or `REDIS_PRIVATE_URL` is configured for Redis-backed rate limits. This can be used with Railway `dev` while keeping `NODE_ENV=development`. `ALLOW_IN_MEMORY_RATE_LIMIT=true` is only acceptable for an intentional single-instance deployment.
- Health checks target `/health`.
- Resend webhook secret is configured.
- Reminder email delivery and any cron caller contract are planned for v3.

## 13. Known Technical Debt

- Add explicit backend email-verification enforcement if required by product policy.
- Split `AuthContext` exports if React Fast Refresh warnings need to be eliminated.
- Address frontend lint issues in test utilities and broader helper code.
- Expand security tests for sanitization, token expiration, rate-limit behavior, and webhook signature verification.
