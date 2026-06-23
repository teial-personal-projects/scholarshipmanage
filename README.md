# ScholarshipManage

ScholarshipManage is a TypeScript web application for students managing scholarship
applications, deadlines, essays, collaborators, recommendations, resources, and
reminders. It is built as an npm workspace monorepo with a React frontend, an
Express REST API, and shared TypeScript domain models.

## Features

### Account and Profile Management

- Register new student accounts through a backend-owned signup flow.
- Log in, log out, reset passwords, and preserve authenticated sessions through
  Supabase Auth.
- Protect application pages so scholarship data is available only to authenticated
  users.
- Manage profile details and role-backed access for student and collaborator
  workflows.

### Scholarship Application Tracking

- Create, edit, view, and manage scholarship applications.
- Track scholarship names, organizations, platforms, websites, application links,
  requirements, award ranges, renewable terms, and current next actions.
- Manage application status across the scholarship lifecycle, including not started,
  in progress, submitted, awarded, and not awarded states.
- Store open dates, due dates, and submission dates for deadline-focused planning.

### Dashboard and Deadline Planning

- Review active scholarship work from a central dashboard.
- Use deadline radar views to surface urgent applications and upcoming due dates.
- Switch between dashboard-oriented views for applications, pending responses,
  reminders, collaborations, and recent action feed items.
- See application cards and workflow signals that help identify what needs attention
  next.

### Essays

- Add essays to scholarship applications.
- Track essay prompts or themes, target word or character counts, and document links.
- Manage essay status and related review work alongside the parent application.
- Keep essay requirements visible in the same workflow as deadlines and
  collaborations.

### Collaborators and Collaboration Workflows

- Store collaborator contacts such as recommenders, essay reviewers, counselors,
  teachers, tutors, and other support people.
- Assign collaborators to specific scholarship applications.
- Track collaboration type, status, notes, action ownership, and next action type.
- Support invitation links and collaborator acceptance flows.

### Recommendations

- Attach recommendation records to applications and collaboration assignments.
- Track recommendation progress as part of the larger application checklist.

### Scholarship Resources

- Browse list of popular scholarship search sites that don't require profile creation

### Security, Validation, and Reliability

- Validate request bodies, route params, and query data with Zod schemas.
- Authenticate protected API routes with Supabase JWT bearer tokens.
- Scope backend data access by the current user profile.
- Apply rate limits, CORS controls, Helmet security headers, and centralized error
  handling.
- Sanitize rich text or rendered HTML surfaces where formatted content is supported.

### Shared Domain Layer

- Share TypeScript types between the React app and Express API.
- Reuse constants, validation helpers, formatting helpers, and case-conversion
  utilities across workspaces.
- Keep database snake_case and application camelCase transformations explicit.

## Architecture

```text
Browser
  -> React SPA in web/
  -> Express REST API in api/
  -> Supabase Auth and PostgreSQL

Shared contracts and utilities live in shared/.
```

The frontend stores Supabase sessions in `sessionStorage`, gets bearer tokens from
the Supabase browser client, and sends authenticated REST requests to the API. The
API verifies Supabase JWTs, validates input with Zod schemas, runs business logic in
services, and uses the Supabase service-role client for data access.

## Repository Layout

```text
.
|-- api/                 Express API, routes, controllers, services, schemas, tests
|-- docs/                System design, database schema, setup, testing, deployment docs
|-- scripts/             Local setup, dev, seed, backup, and schema helper scripts
|-- shared/              Shared TypeScript types, constants, validation, formatting
|-- web/                 React/Vite frontend application
|-- package.json         Root npm workspace scripts
`-- package-lock.json    Locked dependency graph
```

## Tech Stack

| Area | Tools |
| --- | --- |
| Frontend | React 18, Vite, React Router, React Query, Tailwind CSS, lucide-react |
| Backend | Node.js 20+, Express, TypeScript, Zod, Helmet, express-rate-limit |
| Data and auth | Supabase Auth, Supabase PostgreSQL, Row Level Security |
| Email | Resend |
| Testing | Vitest, Testing Library, Supertest |
| Tooling | npm workspaces, tsx, ESLint, TypeScript |

## Prerequisites

- Node.js 20 or newer.
- npm 10 or newer.
- A Supabase project for authentication and PostgreSQL.
- Redis for shared production rate-limit counters, unless deploying a single API
  instance with explicit in-memory limits enabled.

## Getting Started

Install dependencies and build the shared package:

```bash
npm install
npm run build --workspace=shared
```

You can also use the setup script:

```bash
./scripts/setup.sh
```

Create local environment files from the examples:

```bash
cp .env.example .env.local
cp api/.env.example api/.env.local
cp web/.env.example web/.env.local
```

Update the copied files with your Supabase, Resend, app URL, and local API values.
Do not commit `.env.local` files.

## Environment Variables

Root `.env.local` is used by older scholarship finder utilities and database helper
scripts:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string for scripts or finder tooling |
| `OPENAI_API_KEY` | Optional key for historical scholarship finder workflows |
| `GOOGLE_CUSTOM_SEARCH_CX` | Optional Google Custom Search engine id |
| `GOOGLE_API_KEY` | Optional Google API key |

API variables live in `api/.env.local`:

| Variable | Purpose |
| --- | --- |
| `PORT` | API port, defaults to `3001` |
| `NODE_ENV` | Runtime environment, usually `development` locally |
| `APP_URL` | Frontend URL used for CORS and email links |
| `CORS_ALLOWED_ORIGINS` | Comma-separated trusted browser origins |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon key, useful for selected API flows |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend service-role key; keep secret |
| `RESEND_API_KEY` | Resend API key for transactional email |
| `RESEND_WEBHOOK_SECRET` | Resend webhook signing secret |
| `RESEND_FROM_EMAIL` | Verified sender address |
| `RESEND_FROM_NAME` | Sender display name |
| `CRON_SECRET` | Secret used to protect cron endpoints |
| `REDIS_URL` | Optional Redis URL for distributed rate limiting |
| `REDIS_PRIVATE_URL` | Optional private Redis URL for hosted environments |
| `ALLOW_IN_MEMORY_RATE_LIMIT` | Set `true` only for intentional single-instance deployments |

Web variables live in `web/.env.local`:

| Variable | Purpose |
| --- | --- |
| `VITE_API_URL` | API base URL, usually `http://localhost:3001` locally |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key for browser auth |
| `VITE_APP_VERSION` | Optional version string shown by the UI |

## Running Locally

Start the frontend and API together:

```bash
npm run dev
```

Or start one workspace at a time:

```bash
npm run dev:web
npm run dev:api
```

By default, the web app runs on Vite's local development server and the API runs on
`http://localhost:3001`.

## Database

Database migrations live in `api/src/migrations/` and should be applied in order to
your Supabase PostgreSQL database. The current schema covers users, roles,
applications, essays, collaborators, collaborations, recommendations, scholarship resources, categories, and related cleanup migrations.

See `docs/database-schema.md` for the table-by-table schema reference.

## API Surface

The API exposes a health check at `/health` and mounts application routes under
`/api`:

- `/api/auth`
- `/api/users`
- `/api/applications`
- `/api/essays`
- `/api/collaborators`
- `/api/collaborations`
- `/api/recommendations`
- `/api/resources`
- `/api/webhooks`
- `/api/cron`

Most `/api/*` routes require `Authorization: Bearer <supabase-jwt>`. Webhook routes
use provider signature verification, and cron routes use a secret token.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Run web and API development servers concurrently |
| `npm run dev:web` | Run only the web workspace |
| `npm run dev:api` | Run only the API workspace |
| `npm run build` | Build or type-check all workspaces with build scripts |
| `npm run build:web` | Build the React/Vite app |
| `npm run build:api` | Type-check the API |
| `npm run lint` | Run workspace lint scripts where present |
| `npm run type-check` | Type-check all workspaces |
| `npm test --workspace=api` | Run API tests |
| `npm test --workspace=web` | Run web tests |
| `npm test --workspace=shared` | Run shared package tests |

## Testing

Run all available workspace test suites individually:

```bash
npm test --workspace=api
npm test --workspace=web
npm test --workspace=shared
```

Coverage scripts are available in each workspace:

```bash
npm run test:coverage --workspace=api
npm run test:coverage --workspace=web
npm run test:coverage --workspace=shared
```

See `docs/testing_guide.md` and `api/TESTING.md` for endpoint testing, invitation
testing, and future end-to-end testing notes.

## Security Notes

- Keep Supabase service-role keys on the server only.
- Do not commit `.env.local`, production secrets, database dumps with sensitive data,
  or generated credentials.
- API requests use bearer tokens in explicit `Authorization` headers rather than
  cookie-based authentication.
- Access tokens are short-lived, but Supabase refresh tokens keep browser sessions
  alive until the Supabase Auth session expires. Configure a time-boxed session
  lifetime or inactivity timeout in Supabase Auth settings when users must
  periodically re-authenticate.
- Backend routes validate inputs with Zod schemas and sanitize stored or rendered
  HTML where rich text is supported.
- Production deployments should configure a strict CORS allow-list, Redis-backed
  rate limiting, Resend webhook secrets, and environment-specific security headers.

## Deployment Notes

The API is configured for hosted deployment with environment variables, CORS
allow-lists, optional Redis-backed rate limits, and a `/health` endpoint. The web app
can be built as a static Vite application and pointed at the deployed API through
`VITE_API_URL`.

For email delivery, configure a verified Resend domain and set the production
`RESEND_*` variables. See `docs/email-setup-guide.md`.

## Documentation

- `docs/scholarshipmanage_system_design.md`: current architecture and implementation
  status.
- `docs/scholarshipmanage_technical_design.md`: implementation-level technical
  design.
- `docs/database-schema.md`: database schema and migrations.
- `docs/testing_guide.md`: testing strategy and invitation workflow testing.
- `shared/CASE_CONVERSION_GUIDE.md`: snake_case and camelCase conversion guidance.
