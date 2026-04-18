# Database Schema Reference

This document provides a comprehensive reference for the ScholarshipHub database schema, including all tables, relationships, and migrations.

## Overview

The ScholarshipHub database is built on **PostgreSQL** (via Supabase) and uses:
- **Row Level Security (RLS)** for data access control
- **Foreign key constraints** for referential integrity
- **Automatic timestamps** via triggers (`created_at`, `updated_at`)
- **Enum types** for controlled value sets

## Migration History

All migrations are located in `api/src/migrations/` and should be run in order:

1. `001_users_profiles.sql` - Core user tables and authentication
2. `002_applications.sql` - Scholarship applications
3. `003_essays.sql` - Essays associated with applications
4. `004_collaborators.sql` - Collaborators and collaborations system
5. `005_recommendations.sql` - Recommendation letters

---

## Migration 001: Users & Profiles

**File**: `api/src/migrations/001_users_profiles.sql`

### Purpose
Creates the foundation for user authentication and profiles. Extends Supabase's built-in `auth.users` table with additional profile information.

### Tables Created

#### `user_profiles`
Extended user account data linked to Supabase Auth.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | BIGSERIAL | PRIMARY KEY | Auto-generated user ID |
| `auth_user_id` | UUID | UNIQUE, NOT NULL, FK → auth.users | Links to Supabase auth.users |
| `first_name` | TEXT | | User's first name |
| `last_name` | TEXT | | User's last name |
| `email_address` | TEXT | UNIQUE, NOT NULL | User's email |
| `phone_number` | TEXT | | User's phone number |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Account creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

**Indexes**:
- `idx_user_profiles_auth_user_id` on `id`
- `idx_user_profiles_email_address` on `email_address`

**RLS Policies**:
- Users can view, update, and insert their own profile

#### `user_search_preferences`
Normalized storage of user's scholarship search preferences.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `user_id` | BIGINT | PRIMARY KEY, FK → user_profiles | References user profile |
| `target_type` | TEXT | | Merit/Need/Both |
| `subject_areas` | TEXT[] | DEFAULT ARRAY[] | Array of subject areas |
| `gender` | TEXT | | Gender preference |
| `ethnicity` | TEXT | | Ethnicity preference |
| `min_award` | NUMERIC(10,2) | | Minimum award amount |
| `geographic_restrictions` | TEXT | | Geographic restrictions |
| `essay_required` | BOOLEAN | | Whether essay is required |
| `recommendation_required` | BOOLEAN | | Whether recommendation is required |
| `academic_level` | TEXT | | Academic level (High School, Undergraduate, etc.) |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

**RLS Policies**:
- Users can view, update, and insert their own search preferences

#### `user_roles`
Tracks what roles a user has in the system. A user can have multiple roles.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `user_id` | BIGINT | PRIMARY KEY (part), FK → user_profiles | References user profile |
| `role` | user_role | PRIMARY KEY (part), NOT NULL | Role type (student, recommender, collaborator) |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Role assignment timestamp |

**Enum Type**: `user_role`
- `'student'`
- `'recommender'`
- `'collaborator'`

**Indexes**:
- `idx_user_roles_user_id` on `user_id`
- `idx_user_roles_role` on `role`

**RLS Policies**:
- Users can view and insert their own roles

### Functions & Triggers

- `update_updated_at_column()` - Function to automatically update `updated_at` timestamp
- `handle_new_user()` - Trigger function that creates a user profile and assigns default 'student' role when a new user signs up via Supabase Auth
- Triggers on `user_profiles` and `user_search_preferences` to update `updated_at`

---

## Migration 002: Applications

**File**: `api/src/migrations/002_applications.sql`

### Purpose
Creates the core applications table for tracking scholarship applications.

### Tables Created

#### `applications`
Scholarship applications tracked by students.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | BIGSERIAL | PRIMARY KEY | Auto-generated application ID |
| `user_id` | BIGINT | NOT NULL, FK → user_profiles | The student who owns this application |
| `scholarship_name` | TEXT | NOT NULL | Name of the scholarship |
| `target_type` | target_type | | Merit, Need, or Both |
| `organization` | TEXT | | Organization offering the scholarship |
| `org_website` | TEXT | | Organization website URL |
| `platform` | TEXT | | Application platform (e.g., "Common App") |
| `application_link` | TEXT | | Link to application |
| `theme` | TEXT | | Essay theme/topic |
| `min_award` | NUMERIC(10,2) | | Minimum award amount |
| `max_award` | NUMERIC(10,2) | | Maximum award amount |
| `requirements` | TEXT | | Application requirements |
| `renewable` | BOOLEAN | DEFAULT FALSE | Whether scholarship is renewable |
| `renewable_terms` | TEXT | | Terms for renewal |
| `document_info_link` | TEXT | | Link to document requirements |
| `current_action` | TEXT | | Current action needed (e.g., "Waiting for Recommendations") |
| `status` | application_status | DEFAULT 'Not Started' | Application status |
| `submission_date` | DATE | | Date application was submitted |
| `open_date` | DATE | | Date application opens |
| `due_date` | DATE | NOT NULL | Application deadline |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

**Enum Types**:
- `application_status`: 'Not Started', 'In Progress', 'Submitted', 'Awarded', 'Not Awarded'
- `target_type`: 'Merit', 'Need', 'Both'

**Indexes**:
- `idx_applications_user_id` on `user_id`
- `idx_applications_status` on `status`
- `idx_applications_due_date` on `due_date`

**RLS Policies**:
- Users can view, insert, update, and delete their own applications

**Triggers**:
- `update_applications_updated_at` - Updates `updated_at` on row update

---

## Migration 003: Essays

**File**: `api/src/migrations/003_essays.sql`

### Purpose
Creates the essays table for tracking essays associated with applications.

### Tables Created

#### `essays`
Essays associated with scholarship applications.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | BIGSERIAL | PRIMARY KEY | Auto-generated essay ID |
| `application_id` | BIGINT | NOT NULL, FK → applications | References the application |
| `theme` | TEXT | | Essay topic/theme/prompt |
| `units` | TEXT | | Unit type: 'words' or 'characters' |
| `essay_link` | TEXT | | Link to essay document (Google Docs, etc.) |
| `word_count` | INTEGER | | Target or actual word count |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

**Indexes**:
- `idx_essays_application` on `application_id`

**RLS Policies**:
- Users can view, insert, update, and delete essays for their own applications

**Triggers**:
- `update_essays_updated_at` - Updates `updated_at` on row update

---

## Migration 004: Collaborators

**File**: `api/src/migrations/004_collaborators.sql`

### Purpose
Creates a unified polymorphic system for managing collaborators (recommenders, essay reviewers, counselors) and their collaborations with applications.

### Tables Created

#### `collaborators`
People who help students with applications. No type field - same person can do multiple collaboration types.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | BIGSERIAL | PRIMARY KEY | Auto-generated collaborator ID |
| `user_id` | BIGINT | NOT NULL, FK → user_profiles | The student who owns this collaborator |
| `first_name` | TEXT | NOT NULL | Collaborator's first name |
| `last_name` | TEXT | NOT NULL | Collaborator's last name |
| `email` | TEXT | NOT NULL | Collaborator's email |
| `relationship` | TEXT | | Descriptive relationship (e.g., 'Teacher', 'Counselor', 'Tutor') |
| `phone_number` | TEXT | | Collaborator's phone number |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

**Indexes**:
- `idx_collaborations_collaborator` on `collaborator_id` (via collaborations table)

**RLS Policies**:
- Users can view, insert, update, and delete their own collaborators

#### `collaborations`
Base table linking collaborators to applications with specific collaboration types. Contains common fields for all collaboration types.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | BIGSERIAL | PRIMARY KEY | Auto-generated collaboration ID |
| `collaborator_id` | BIGINT | NOT NULL, FK → collaborators | The collaborator |
| `application_id` | BIGINT | NOT NULL, FK → applications | The application |
| `collaboration_type` | collaboration_type | NOT NULL | Type of collaboration |
| `status` | collaboration_status | DEFAULT 'pending' | Current status |
| `awaiting_action_from` | action_owner | | Who needs to act next |
| `awaiting_action_type` | TEXT | | Type of action needed |
| `next_action_description` | TEXT | | Description of next action |
| `next_action_due_date` | DATE | | Due date for next action |
| `notes` | TEXT | | Additional context or instructions |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

**Enum Types**:
- `collaboration_type`: 'recommendation', 'essayReview', 'guidance'
- `collaboration_status`: 'pending', 'invited', 'in_progress', 'submitted', 'completed', 'declined'
- `action_owner`: 'student', 'collaborator'

**Unique Constraint**: `(collaborator_id, application_id, collaboration_type)` - A collaborator can only have one collaboration of each type per application

**Indexes**:
- `idx_collaborations_collaborator` on `collaborator_id`
- `idx_collaborations_application` on `application_id`
- `idx_collaborations_type` on `collaboration_type`
- `idx_collaborations_status` on `status`
- `idx_collaborations_action_owner` on `awaiting_action_from`

**RLS Policies**:
- Users can view their own collaborations (via collaborator ownership)

#### `essay_review_collaborations`
Type-specific data for essay review collaborations. One collaboration can review multiple essays.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | BIGSERIAL | PRIMARY KEY | Auto-generated ID |
| `collaboration_id` | BIGINT | NOT NULL, FK → collaborations | References base collaboration |
| `essay_id` | BIGINT | NOT NULL, FK → essays | The essay being reviewed |
| `current_draft_version` | INT | DEFAULT 0 | Current draft version number |
| `feedback_rounds` | INT | DEFAULT 0 | Number of feedback rounds |
| `last_feedback_at` | TIMESTAMPTZ | | Timestamp of last feedback |

**Unique Constraint**: `(collaboration_id, essay_id)` - Prevents duplicate essay assignments

**Indexes**:
- `idx_essay_review_essay` on `essay_id`

**RLS Policies**:
- Users can view essay reviews for their own collaborations

#### `recommendation_collaborations`
Type-specific data for recommendation collaborations. One-to-one with collaboration.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | BIGSERIAL | PRIMARY KEY | Auto-generated ID |
| `collaboration_id` | BIGINT | NOT NULL, UNIQUE, FK → collaborations | References base collaboration |
| `portal_url` | TEXT | | URL to recommendation portal |
| `questionnaire_completed` | BOOLEAN | DEFAULT FALSE | Whether questionnaire is completed |
| `letter_submitted_at` | TIMESTAMPTZ | | Timestamp when letter was submitted |

**Note**: The deadline for portal submission is tracked via `next_action_due_date` in the base `collaborations` table.

**RLS Policies**:
- Users can view recommendation collaborations for their own collaborations

#### `guidance_collaborations`
Type-specific data for guidance/counseling collaborations. One-to-one with collaboration.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | BIGSERIAL | PRIMARY KEY | Auto-generated ID |
| `collaboration_id` | BIGINT | NOT NULL, UNIQUE, FK → collaborations | References base collaboration |
| `session_type` | session_type | | Type of session |
| `meeting_url` | TEXT | | URL for meeting (Zoom, etc.) |
| `scheduled_for` | TIMESTAMPTZ | | Scheduled meeting time |

**Enum Type**: `session_type`
- `'initial'`
- `'followup'`
- `'final'`

**RLS Policies**:
- Users can view guidance collaborations for their own collaborations

#### `collaboration_history`
Audit log of all collaboration actions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | BIGSERIAL | PRIMARY KEY | Auto-generated ID |
| `collaboration_id` | BIGINT | NOT NULL, FK → collaborations | References collaboration |
| `action` | TEXT | NOT NULL | Action type (e.g., 'invited', 'reminder_sent', 'viewed') |
| `details` | TEXT | | Additional details about the action |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Action timestamp |

**RLS Policies**:
- Users can view collaboration history for their own collaborations

**Triggers**:
- `update_collaborators_updated_at` - Updates `updated_at` on collaborators table
- `update_collaborations_updated_at` - Updates `updated_at` on collaborations table

---

## Migration 005: Recommendations

**File**: `api/src/migrations/005_recommendations.sql`

### Purpose
Creates a separate recommendations table for tracking recommendation letters. This provides a simpler alternative to the collaboration system for basic recommendation tracking.

### Tables Created

#### `recommendations`
Recommendation letters for scholarship applications.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | BIGSERIAL | PRIMARY KEY | Auto-generated recommendation ID |
| `application_id` | BIGINT | NOT NULL, FK → applications | The application |
| `recommender_id` | BIGINT | NOT NULL, FK → collaborators | The collaborator writing the recommendation |
| `status` | recommendation_status | DEFAULT 'Pending' | Current status |
| `submitted_at` | TIMESTAMPTZ | | Timestamp when recommendation was submitted |
| `due_date` | DATE | | Deadline for submitting the recommendation |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

**Enum Type**: `recommendation_status`
- `'Pending'`
- `'Submitted'`

**Unique Constraint**: `(application_id, recommender_id)` - A recommender can only have one recommendation per application

**Indexes**:
- `idx_recommendations_application_id` on `application_id`
- `idx_recommendations_recommender_id` on `recommender_id`
- `idx_recommendations_status` on `status`

**RLS Policies**:
- Users can view, insert, update, and delete recommendations for their own applications

**Triggers**:
- `update_recommendations_updated_at` - Updates `updated_at` on row update

---

## Entity Relationship Diagram

```
auth.users (Supabase)
    ↓
user_profiles
    ├── user_search_preferences (1:1)
    ├── user_roles (1:many)
    ├── applications (1:many)
    │   ├── essays (1:many)
    │   └── recommendations (1:many)
    └── collaborators (1:many)
        └── collaborations (1:many)
            ├── essay_review_collaborations (1:many)
            ├── recommendation_collaborations (1:1)
            ├── guidance_collaborations (1:1)
            └── collaboration_history (1:many)
```

---

## Running Migrations

### In Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of each migration file in order
4. Run each migration sequentially
5. Verify tables are created in **Table Editor**

### Using Supabase CLI (Recommended for Production)

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

### Migration Order

**Important**: Run migrations in this exact order:

1. `001_users_profiles.sql`
2. `002_applications.sql`
3. `003_essays.sql`
4. `004_collaborators.sql`
5. `005_recommendations.sql`

---

## Row Level Security (RLS)

All tables have RLS enabled. Policies ensure:
- Users can only access their own data
- Foreign key relationships are respected
- Collaborators can only see collaborations for applications they're involved with

### Policy Pattern

Most policies follow this pattern:
```sql
CREATE POLICY "Users can view own [resource]" ON public.[table]
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM public.user_profiles
      WHERE auth_user_id = auth.uid()
    )
  );
```

---

## Best Practices

1. **Always run migrations in order** - Dependencies exist between migrations
2. **Test migrations in development first** - Use a test Supabase project
3. **Backup before migrations** - Use `scripts/backup-db.sh` before major changes
4. **Document schema changes** - Update this file when adding new migrations
5. **Use transactions** - Wrap migration scripts in transactions when possible

---

## Troubleshooting

### Migration Fails

1. Check error message for specific issue
2. Verify all dependencies exist (previous migrations run)
3. Check for naming conflicts (enums, tables, functions)
4. Ensure RLS policies don't conflict

### RLS Policy Issues

1. Verify `auth.uid()` is available in context
2. Check foreign key relationships are correct
3. Test policies with actual user data

### Foreign Key Violations

1. Ensure referenced tables exist
2. Check data exists before creating foreign keys
3. Verify ON DELETE CASCADE behavior is correct

---

## Future Migrations

When adding new migrations:

1. Number sequentially: `006_[name].sql`
2. Document in this file
3. Update entity relationship diagram
4. Test thoroughly before production
5. Add to migration history above

---

## References

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)

