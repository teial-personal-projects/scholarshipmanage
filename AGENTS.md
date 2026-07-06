# Project Guide

## Project Overview

ScholarshipManage is a TypeScript monorepo for tracking scholarship
applications, essays, collaborators, recommendations, reminders, and dashboard
views.

## Tech Stack

- Root workspace: npm workspaces, Node 20+, npm 10+.
- Web: Vite, React 18, TypeScript, Tailwind CSS 4, React Router,
  Supabase auth client, React Query, Vitest, Testing Library.
- API: Express 4, TypeScript ESM, Supabase, Zod validation,
  Helmet/CORS/rate limiting, Vitest and Supertest.
- Shared: TypeScript package exported as `@scholarshipmanage/shared` for
  domain types, constants, validation, formatting, and case conversion.
- Database: Supabase/Postgres SQL migrations under `api/src/migrations`;
  consolidated schema in `api/src/schema.sql`.

## Commands

```bash
npm run dev
npm run dev:web
npm run dev:api
npm run build
npm run lint
npm run type-check
npm test --workspace=@scholarshipmanage/web
npm test --workspace=@scholarshipmanage/api
npm test --workspace=@scholarshipmanage/shared
```

Prefer targeted workspace tests after small changes, then broader `type-check`
or `build` when shared contracts changed.

## Project Structure

- `web/src/pages`: route-level React screens.
- `web/src/components`: reusable UI and feature components.
- `web/src/services/api.ts`: authenticated frontend API client.
- `web/src/utils`: frontend formatting, filtering, dashboard, deadline, and
  toast helpers.
- `web/src/test/fixtures`: frontend component test fixtures.
- `api/src/routes`: Express route registration and route tests.
- `api/src/controllers`: request validation, auth checks, response shaping.
- `api/src/services`: Supabase queries and persistence mapping.
- `api/src/schemas`: Zod request schemas.
- `api/src/migrations`: incremental database migrations.
- `api/src/schema.sql`: current database schema snapshot for fresh setup/reference.
- `shared/src/types`: shared domain and API response types.
- `shared/src/utils`: cross-package helpers, including snake_case/camelCase conversion.
- `docs`: design, schema, deployment, and testing documentation.
- `scripts`: setup, seed, backup, schema dump, and import helper scripts.

## Architecture

Data generally flows from React pages/components through
`web/src/services/api.ts` to Express routes, then controllers, Zod schemas,
service functions, and Supabase tables. API controllers convert database
snake_case responses to camelCase using `toCamelCase` from the shared package.
Frontend code should consume camelCase `ApplicationResponse`,
`CollaborationResponse`, and related shared types.

Application data is stored in `applications`; work items are represented by
related `essays`, `recommendations`, and `collaborations`. Grid and dashboard
dependency indicators are derived in frontend utilities such as
`web/src/utils/pendingWork.ts`, `needsAction.ts`, and deadline helpers.

## Code Patterns

- Keep shared API contracts in `shared/src/types/api-responses.types.ts` and
  domain constants in `shared/src/types/application.constants.ts`.
- Add or update Zod schemas in `api/src/schemas` for request payload changes.
- Map camelCase request fields to snake_case database columns explicitly in API
  services.
- Add database changes as a new numbered migration and update `api/src/schema.sql`.
- Use existing UI components, Tailwind utility patterns, and `lucide-react` icons.
- Use date helpers in `web/src/utils/date.ts`; avoid manual date formatting.
- Use existing toast helpers and typed API utilities for frontend error handling.
- Preserve user changes in the working tree; do not revert unrelated files.

## Testing

- API route behavior lives near routes as `*.test.ts`; service tests live near services.
- React component tests use Testing Library and fixtures in `web/src/test/fixtures`.
- Shared utility tests live under `shared/src/utils`.
- For application field changes, usually update or run:

```bash
npm test --workspace=@scholarshipmanage/web -- GridView
npm test --workspace=@scholarshipmanage/api -- applications
npm run type-check
```

## Validation

Request validation is done with Zod in the API schema layer. Frontend form
values are usually strings and converted to numbers/nulls in local `toPayload`
helpers before submission. The API owns final validation and defaulting; the
database should still have safe defaults for optional persisted fields.

## Key Files

- `shared/src/types/api-responses.types.ts`: API response shapes consumed by web.
- `api/src/schemas/applications.schemas.ts`: application create/update validation.
- `api/src/services/applications.service.ts`: application persistence mapping.
- `web/src/components/ApplicationFormSections.tsx`: reusable application form sections.
- `web/src/components/ApplicationForm.tsx`: create/edit page form state and payload.
- `web/src/components/ApplicationPanel.tsx`: dashboard/detail panel draft state
  and payload.
- `web/src/components/GridView.tsx`: applications grid columns, sorting,
  filtering, and mobile cards.

## On-Demand Context

- Before changing a feature, search with `rg` for the field/type/component name
  across `web/src`, `api/src`, and `shared/src`.
- For database-backed fields, inspect the migration history and `schema.sql`.
- For user-visible application grid changes, inspect `GridView.tsx` and
  `GridView.test.tsx`.
- For create/edit behavior, inspect both `ApplicationForm.tsx` and
  `ApplicationPanel.tsx`.

## Notes

- Existing API responses may include nested Supabase relationship data; confirm
  the frontend type shape before relying on a relation.
- Some older tests and fixtures still contain legacy names such as `amount` or
  `deadline`; prefer current shared types and camelCase names for new work.
