# ScholarshipManage System Design

Version: 1.1

Date: 2026-06-22

Status: Current implementation snapshot

## 1. Purpose

ScholarshipManage is a web application for students managing scholarship applications, deadline-driven work, essays, recommenders, essay reviewers, and related reminders. This system design document describes the current architecture, component boundaries, security model, and major trade-offs.

This document focuses on architectural decisions. Implementation details are covered in `docs/scholarshipmanage_technical_design.md`.

## 2. System Scope

### 2.1 In Scope

- Student authentication, profile management, and role lookup.
- Scholarship application creation, tracking, detail editing, status management, and dashboard views.
- Deadline radar, reminders, pending response indicators, and action feed views.
- Essay records associated with applications.
- Collaborator records for recommenders, essay reviewers, and guidance collaborators.
- Collaboration assignments, history entries, invitation sending, invitation scheduling, and invitation acceptance.
- Recommendation records attached to applications and collaborations.
- Scholarship resource listing.
- Resend webhook handling for email delivery events.
- Shared TypeScript domain types and utilities across frontend and backend.

### 2.2 Out of Scope

- Native mobile applications.
- Offline mode.
- Real-time collaborative editing.
- Payment processing.
- Institution-level multi-tenancy.
- Public SEO-oriented marketing pages.
- Direct document storage beyond links, notes, and structured metadata.
- Automated reminder delivery through cron jobs or cron endpoints. Reminder scheduling and delivery are planned for v3.

## 3. Actors

- Student: Primary authenticated user who owns applications, essays, collaborators, and collaboration workflows.
- Collaborator: External or invited participant who may support recommendations, essay review, or guidance workflows.
- Recommender: Collaborator acting in a recommendation-specific workflow.
- Email provider: Resend, used for outbound email and delivery webhooks.

## 4. Architecture Overview

ScholarshipManage is implemented as a TypeScript monorepo with three workspaces:

- `web`: React SPA frontend.
- `api`: Express REST API.
- `shared`: Shared TypeScript types, constants, validation helpers, formatting helpers, and case conversion utilities.

The application uses Supabase for PostgreSQL persistence and authentication. The frontend uses the Supabase browser client for login, logout, password reset, session persistence, and bearer token retrieval. The backend uses the Supabase service-role client for business operations and Supabase Auth admin APIs where needed.

```text
Browser
  |
  | React Router, Tailwind UI, Supabase browser auth
  v
React SPA (web)
  |
  | REST JSON over HTTP with Authorization: Bearer <jwt>
  v
Express API (api)
  |
  | Routes -> middleware -> controllers -> services
  v
Supabase
  |
  | PostgreSQL tables, auth users, RLS policies, triggers
  v
Persistent data

External integrations:
  - Resend webhook -> /api/webhooks/resend
```

## 5. Major Architectural Decisions

### 5.1 Monorepo with NPM Workspaces

The project uses NPM workspaces for `web`, `api`, and `shared`.

This keeps frontend, backend, and shared type updates atomic. It also avoids a separate package publishing process for shared model contracts while the product is still small enough for a single repository.

### 5.2 React SPA with REST API

The frontend is a client-rendered React application that talks to an Express REST API.

This fits an authenticated workflow-heavy product where SEO is not a key requirement. REST keeps the backend simple and inspectable, and the route/controller/service structure is sufficient for the current domain.

### 5.3 Supabase for Auth and PostgreSQL

Supabase provides PostgreSQL, Auth, JWT sessions, and database-level security primitives.

The data model is relational: applications, essays, collaborators, collaborations, recommendations, reminders, and resources all have clear ownership and foreign-key relationships. PostgreSQL is a better fit than document storage for these workflows.

### 5.4 Backend-Owned Registration

The backend owns account creation through `POST /api/auth/register`.

The registration flow creates the Supabase Auth user, creates or updates the user profile, assigns the default `student` role, and returns session data. This prevents split-brain failures where the frontend creates an auth user but fails to create the application profile.

The frontend still handles login directly with Supabase Auth.

### 5.5 Layered API

The backend uses:

1. Routes for endpoint mapping.
2. Middleware for authentication, role checks, validation, rate limits, and error handling.
3. Controllers for HTTP request/response handling.
4. Services for business logic.
5. Supabase utilities for persistence.

This keeps HTTP concerns out of business logic and makes service tests practical.

### 5.6 Shared Types and Case Conversion

Database records use snake_case, while frontend and API-facing TypeScript models use camelCase. The shared package provides types and utilities to keep those transformations explicit.

## 6. System Components

### 6.1 Frontend

Responsibilities:

- Render route-level pages and reusable components.
- Maintain Supabase authentication state through `AuthContext`.
- Protect authenticated routes with `ProtectedRoute`.
- Call authenticated API endpoints through `web/src/services/api.ts`.
- Handle token refresh on API 401 responses.
- Sanitize rendered HTML content where needed.
- Present toasts and user-facing error states.

Current primary route areas:

- Authentication: login, registration, forgot password, reset password.
- Dashboard: deadline radar, grid view, reminders, collaborations, pending responses, and action feed.
- Applications: create application, application detail panel, essays, collaborations, recommendations.
- Collaborators: collaborator management and invitation acceptance.
- Resources: scholarship resources.
- Profile: current user profile settings.

### 6.2 Backend API

Responsibilities:

- Validate API input with Zod schemas.
- Authenticate bearer tokens with Supabase Auth.
- Enforce roles through middleware.
- Apply route-specific and global rate limits.
- Execute domain workflows through services.
- Send email and process email provider callbacks.
- Return consistent HTTP responses and operational errors.

### 6.3 Database

Responsibilities:

- Persist all core domain data.
- Enforce foreign-key, uniqueness, and check constraints.
- Maintain user-profile and role data tied to Supabase Auth users.
- Support RLS policies for direct database safety.
- Store scholarship resource and category data.

### 6.4 Shared Package

Responsibilities:

- Shared domain types.
- Application constants and status lists.
- Validation and formatting helpers.
- Case conversion helpers.

## 7. Security Architecture

### 7.1 Authentication

Authentication is based on Supabase Auth JWTs.

- The frontend stores sessions in `sessionStorage`.
- API requests send `Authorization: Bearer <token>`.
- The backend verifies tokens with Supabase before protected route access.
- Browser cookies are not used for API authentication.

### 7.2 Authorization

Authorization is layered:

- Backend middleware enforces authenticated access and role requirements.
- Services scope queries by the current user profile.
- Database RLS policies provide an additional protection layer.

Current roles include `student`, `recommender`, and `collaborator`.

### 7.3 Input Validation and Sanitization

The API validates request bodies, params, and query values with Zod. Schemas are strict where unknown keys must be rejected.

HTML content is sanitized with DOMPurify-compatible utilities on both server and client sides. This is used for notes and rich text surfaces where formatted content can be stored or rendered.

### 7.4 Rate Limiting

The API applies:

- A general `/api` limiter.
- Public endpoint limits for health checks.
- Authentication limits for login and registration.
- Read, list, write, and delete operation limits.
- Webhook limits.

Registration rate limiting is skipped in `local`, `development`, and `test` environments to support iterative local testing. Production keeps the stricter registration protection.

### 7.5 Security Headers

Helmet is used for baseline security headers. Additional headers are set in `api/src/config/security-headers.ts`. The configuration is environment-aware.

### 7.6 CSRF Position

The API uses bearer tokens in explicit `Authorization` headers rather than cookie-based authentication. Browsers do not automatically attach these headers to cross-site requests, so the current architecture does not rely on CSRF middleware.

## 8. Reliability and Operations

- The API has a `/health` endpoint.
- Errors flow through a global Express error handler.
- Resend webhooks are received through a raw-body route for signature verification.
- Database migrations live under `api/src/migrations`.
- Local environment loading supports `.env.<NODE_ENV>`, with `.env.local` used for local development.

## 9. Current Constraints

- The backend uses the Supabase service role key, so service code must carefully scope data access.
- Rate limiting uses the default in-memory store, suitable for local and single-instance deployments but not distributed production scaling.
- Email verification enforcement is not yet applied as a backend access gate.
- The frontend is an SPA and requires JavaScript.
- Session persistence uses `sessionStorage`, which improves token exposure posture but requires re-login across browser sessions and can be less convenient across tabs.

## 10. Trade-offs

| Decision | Benefit | Cost |
| --- | --- | --- |
| React SPA | Fast authenticated UI development and rich interactions | No SSR and limited SEO value |
| REST API | Simple routing, testing, and debugging | Less flexible than GraphQL for arbitrary client queries |
| Supabase managed platform | Auth, database, and operational simplicity | Vendor dependency and service-role key discipline |
| NPM workspaces | Simple shared code and atomic changes | Less build orchestration than Nx or Turborepo |
| In-memory rate limits | Easy local and single-instance setup | Needs Redis or another store for multi-instance production |
| Session storage | Reduces long-lived browser token exposure | Less persistent login experience |

## 11. Implementation Status

| Area | Status |
| --- | --- |
| Authentication | Implemented |
| Backend registration | Implemented |
| Password reset | Implemented through Supabase |
| Application tracking | Implemented |
| Dashboard and deadline radar | Implemented |
| Essays | Implemented |
| Collaborators and invitations | Implemented |
| Collaboration history | Implemented |
| Recommendations | Implemented |
| Scholarship resources | Implemented |
| Reminder data and dashboard views | Implemented |
| Reminder emails and cron route | Planned for v3 |
| Resend webhooks | Implemented |
| Rate limiting | Implemented, with local registration bypass |
| CORS origin allow-list | Implemented |
| Distributed rate-limit store | Pending |
| Email verification gate | Pending |

## 12. Related Documents

- Technical design: `docs/scholarshipmanage_technical_design.md`
- Database schema: `docs/database-schema.md`
- Testing guide: `docs/testing_guide.md`
- Email setup: `docs/email-setup-guide.md`
- Scaling and deployment: `docs/SCALING_DEPLOYMENT.md`
