# Supabase setup

## 1. Create the project

1. Create a Supabase project (Postgres + Auth + Storage).
2. Install the Supabase CLI and log in: `supabase login`.
3. Link the project: `supabase link --project-ref <your-project-ref>`.

## 2. Environment

Copy `.env.example` to `.env.local` and set:

- `NEXT_PUBLIC_SUPABASE_URL` — project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — public anon key (RLS protected).
- `NEXT_PUBLIC_SITE_URL` — `http://localhost:3000` locally, your deployed URL in production.

`SUPABASE_SERVICE_ROLE_KEY` is only for CLI/admin scripts. It must never be
prefixed with `NEXT_PUBLIC_` or imported into application code.

## 3. Auth configuration (dashboard → Authentication → URL Configuration)

Set **Site URL** to `NEXT_PUBLIC_SITE_URL` and add these redirect URLs:
`http://localhost:3000/auth/confirm`, `http://localhost:3000/reset-password`,
and `http://localhost:3000/**` (plus the equivalent deployed origin URLs).
The access token used for migrations did not include `auth_config_write`, so
this step must be completed in the dashboard or with a scoped token.

- **Site URL**: `http://localhost:3000` (or production URL).
- **Redirect URLs**:
  - `http://localhost:3000/auth/confirm`
  - `http://localhost:3000/reset-password`
  - `http://localhost:3000/**` for deployed origins as needed.
- Enable email/password sign-in.
- Email confirmation is supported via the `/auth/confirm` route handler.

## 4. Apply migrations

```bash
supabase db push
```

Migrations create nine tables, helper functions, triggers, the private
`note-files` bucket and all RLS policies in order. Do not edit applied
migrations; add a new numbered migration instead.

## 5. Storage

- Bucket `note-files` is **private**.
- Object path: `{auth.uid()}/{workspace_id}/{file_id}-{filename}`.
- Signed URLs are generated server-side; no public bucket URLs are used.

## 6. Test the policies

```bash
supabase test db
```

`supabase/tests/rls.sql` uses pgTAP to verify RLS on all nine tables, workspace
isolation, shared-note access and private storage paths.

Policy intent and ownership rules are documented in `SECURITY.md`.

## 7. Note version retention

`note_versions` keeps the latest 50 meaningful snapshots per note by default.
To change the limit, set the database setting (superuser/owner session):

```sql
alter database postgres set app.max_note_versions = '100';
```

Snapshots are created only when title, Tiptap JSON or Markdown actually change.
Restoring a version never modifies the historical row; it adds a new snapshot.

## 8. Sharing hardening (migrations 0015–0018)

- `note_attachments` supports explicit file access grants with an UPDATE policy.
- Invitations are one-time use: accepting clears the stored token hash.
- Soft-deleted notes are inaccessible through shared-note policies.
- Collaborators can claim only their own invitation and cannot change permission,
  note, owner, email or expiry.

## 9. Individual sharing

Migrations `0013` and `0014` add editor-update permissions for explicitly
shared notes and `note_attachments`. A private file is readable to a
collaborator only when it is explicitly attached to a note shared with them.
Realtime updates are best-effort and conflict-checked in the editor.

## 10. Run the app

```bash
npm install
npm run dev
```

With valid configuration, signup creates a profile and a private workspace via
the `handle_new_user` trigger. Without configuration the app renders an explicit
setup state instead of pretending data is persisted.

## 8. Live verification (completed)

Migrations were applied to the linked project with `supabase db push --remote`.
Smoke tests against the live project passed for: trigger-created profile and
workspace, password sign-in, note insert/read/update, version snapshot trigger,
RLS isolation between two users, authenticated page rendering, the command API
using real services, and protected-route redirects. See `scripts/README.md`.

The pgTAP suite (`supabase/tests/rls.sql`) still requires a local Supabase
stack/Docker and has not been executed here; live RLS isolation was instead
checked directly with two temporary users.
