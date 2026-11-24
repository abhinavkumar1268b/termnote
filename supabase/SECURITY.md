# Security and RLS policy documentation

## Principals

- `auth.uid()` is the only source of identity in RLS policies.
- A user may access a row only when they own the workspace that contains it.
- Collaborators may read **only** an explicitly shared note; they never gain
  workspace, folder, file or history access.

## Helper functions (all `security definer`, `search_path = public`)

| Function | Purpose |
| --- | --- |
| `owns_workspace(uuid)` | Owner check for workspace-scoped tables. |
| `owns_note(uuid)` | Owner check via the note's workspace. |
| `can_read_note(uuid)` | Owner or invited collaborator with an unexpired share. |

`security definer` is required to prevent recursive RLS evaluation between
`notes` and `note_shares`. Execute permission is granted only to `authenticated`.

## Table policies

| Table | SELECT | INSERT / UPDATE / DELETE |
| --- | --- | --- |
| `profiles` | own `id` | own `id` |
| `workspaces` | `owner_id = auth.uid()` | owner only |
| `folders` | `owns_workspace` | owner only; parent must be same workspace |
| `notes` | `owns_workspace` OR `can_read_note` | owner only |
| `note_versions` | `owns_note` | insert by owner/trigger; no app updates |
| `files` | `owns_workspace` | owner only |
| `starred_items` | `user_id = auth.uid()` AND `owns_workspace` | insert/delete by owner |
| `note_shares` | owner OR invited email | owner only |
| `note_attachments` | reader of the shared note | owner/editor, delete owner only |
| `activity_logs` | `owns_workspace` | insert with `actor_id = auth.uid()`; no updates |

All nine tables have RLS enabled. No `service_role` bypass exists in app code.

## Storage

`storage.objects` policies for bucket `note-files` require the first path
segment to equal `auth.uid()::text`. The bucket is private. Uploads validate
size and MIME type in server code before a metadata row is inserted.

## Tokens and credentials

- Invitation tokens are stored as `token_hash`; the raw token is never persisted.
- `SUPABASE_SERVICE_ROLE_KEY` is only used by the CLI, never by the app.
- Browser code receives only `NEXT_PUBLIC_SUPABASE_URL` and the anon key.

## Server-side checks

RLS is the last line of defence, not the only one. Every server-side data
service first resolves the authenticated user's workspace and filters by its
id. Ownership is verified before mutations. Client-side checks are never
trusted.

## Verification status

Migrations were applied to a live Supabase project. Smoke tests confirmed the
new-user trigger, note persistence, version snapshots, workspace isolation
between two authenticated users, protected routes and server-side command reads.
The pgTAP suite (`supabase/tests/rls.sql`) requires a local Docker stack and has
not been executed; live isolation was verified directly with temporary users.
