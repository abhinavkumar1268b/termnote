# TermNote production deployment

## 1. Supabase project

Create a Supabase project (Postgres, Auth, Storage). Record:

- Project URL (`NEXT_PUBLIC_SUPABASE_URL`)
- Anon / publishable key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- Service-role key (`SUPABASE_SERVICE_ROLE_KEY`) — **CLI/admin use only**
- Project ref (`SUPABASE_PROJECT_REF`)
- Management access token (`SUPABASE_ACCESS_TOKEN`) — CI/migration use only

## 2. Apply migrations

```bash
npm install
supabase login
supabase link --project-ref <project-ref>
supabase db push --remote
```

Migrations `0001`–`0018` create:

- `profiles`, `workspaces`, `folders`, `notes`, `note_versions`, `files`,
  `starred_items`, `note_shares`, `activity_logs`, `note_attachments`.
- RLS on every user-data table.
- `owns_workspace`, `owns_note`, `can_read_note`, `can_edit_note`,
  `can_read_file` security-definer helpers.
- New-user profile/workspace trigger.
- Version snapshots with 50-version retention (`app.max_note_versions`).
- Private `note-files` bucket with user-prefixed paths.
- One-time, expiring invitation tokens (hashed at rest).

Verify policy tests locally with a Docker stack:

```bash
supabase start
supabase test db
```

## 3. Auth configuration

In Supabase dashboard → Authentication → URL Configuration:

- **Site URL**: your production origin, e.g. `https://termnote.example.com`.
- **Redirect URLs**:
  - `https://termnote.example.com/auth/confirm`
  - `https://termnote.example.com/reset-password`
  - `https://termnote.example.com/**`
- Enable email/password sign-in.
- Set a custom SMTP provider in Production so confirmation/reset emails deliver.

## 4. Environment variables

Set these in Vercel → Project → Settings → Environment Variables:

| Variable | Scope | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | All | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | All | Publishable/anon key (safe in browser) |
| `NEXT_PUBLIC_SITE_URL` | All | Production origin, no trailing slash |
| `MAX_UPLOAD_BYTES` | Server | Optional; default `10485760` (10 MB) |

**Never** add `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ACCESS_TOKEN` or
`SUPABASE_PROJECT_REF` to Vercel. They are only for local CLI migration work.
Application code imports only the anon key and uses RLS + the user's session.

## 5. Deploy

1. Push the repository to GitHub/GitLab.
2. Import it in Vercel (`vercel.json` sets the framework and build command).
3. Add the environment variables above.
4. Deploy. The build runs `npm run build`; all app routes are dynamic because
   session-aware Server Components read cookies.

Alternatively:

```bash
npm i -g vercel
vercel link
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel --prod
```

## 6. Post-deploy verification

- Sign up, confirm email, sign in, sign out, reset password.
- Create a nested folder, note, upload, preview/download.
- Edit a note and confirm autosave + version snapshot.
- Invite a viewer and editor; verify permissions and revocation.
- Run `node scripts/audit.mjs` with `base` pointed at the production URL
  (use a throwaway Supabase project — it creates and deletes users).

## 7. Operational notes

- Storage bucket `note-files` is private; all access is via server-generated
  signed URLs. No public bucket URLs exist.
- The service-role key is never bundled into client code; a smoke check in
  `scripts/audit.mjs` asserts this.
- Command execution goes through `/api/commands`, which uses the authenticated
  user's session and server-side adapters. It returns 503 when Supabase is
  unconfigured; there is no mock-data fallback in production.
