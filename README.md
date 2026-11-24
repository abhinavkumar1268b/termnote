# TermNote

Private-first, command-driven notes and file management. A minimal Cyber Blue
terminal-inspired web application.

## Status

Supabase Auth, Postgres, private Storage and RLS are wired into the app. All 11
migrations were applied to a live project and smoke tests confirmed note
persistence, new-user workspace creation, version snapshots, RLS isolation,
authenticated rendering and protected routes. See `supabase/README.md` and
`supabase/SECURITY.md`. Auth redirect URLs still need to be set in the Supabase
dashboard because the supplied access token lacked `auth_config_write`.

## Stack

- Next.js 16 (App Router) with React 19 and strict TypeScript
- Tailwind CSS 4
- Supabase Auth, Postgres, private Storage, Row Level Security
- Tiptap (canonical note content as JSON)
- Zod for input validation
- Lucide for icons
- Vitest for unit tests

## Getting started

1. Install dependencies: `npm install`.
2. Copy `.env.example` to `.env.local` and set:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL`
3. Apply migrations and configure Auth/Storage using `supabase/README.md`.
4. Start the dev server: `npm run dev` → <http://localhost:3000>.

Without configuration the app renders explicit setup states instead of showing
sample data as if it were persisted.

## Auth routes

- `/login`, `/signup` — email/password auth with Zod validation.
- `/auth/confirm` — PKCE code exchange for email confirmation and resets.
- `/reset-password` — request or complete a password reset.
- `/logout` via the sidebar action.
- Workspace routes are protected by `proxy.ts` and server-side session checks.

## Scripts

| Command              | Purpose                    |
| -------------------- | -------------------------- |
| `npm run dev`        | Start the dev server       |
| `npm run build`      | Production build           |
| `npm run start`      | Serve the production build |
| `npm run lint`       | Run ESLint                 |
| `npm run typecheck`  | Check TypeScript types     |
| `npm test`           | Run unit tests with Vitest |

## Structure

```
app/            Routes, layouts, Server Actions, command API
components/     Reusable UI and the application shell
features/       Feature UI modules
lib/commands/   Safe command engine and service adapters
lib/data/       Server-side Supabase data services
lib/actions/    Shared action result types
lib/folders/    Pure folder-tree helpers
lib/uploads/    Configurable size/MIME and filename rules
lib/supabase/   Auth clients and configuration
mocks/          Offline sample data (command engine fallback only)
supabase/       Migrations, pgTAP policy tests, security docs
types/          Shared domain types
tests/          Unit tests
```

## Terminal commands

The command engine accepts both namespaced commands (`note create`, `folder list`)
and short natural forms: `create file "Ideas"`, `create subfolder "Frontend" inside "Projects"`,
`open "Ideas"`, `rename "Ideas" to "Ideas 2026"`, `move "Ideas" to "Personal"`,
`delete "Ideas"`, `search "term"`, `show recent|starred|trash|files|shared`,
`upload file` and `help`. Destructive commands ask for confirmation. All commands
run through the same server-side validation, RLS and service adapters as the UI.

The command input supports `Ctrl+K` to focus, `↑/↓` for history, `Tab` to accept a
suggestion (without executing it), `Enter` to run, and `Esc` to close suggestions.
Typing a command name shows ready-to-edit examples such as
`create file "name"` and `open folder "folder name"`. `clear` (or the output
panel's Clear control) clears only visible terminal output.

## Deployment

See `DEPLOYMENT.md` for Vercel + Supabase production setup, required
environment variables, migration steps and post-deploy verification.

## Principles

- Private by default; authorization is enforced by RLS and server-side checks.
- Notes use Tiptap JSON as canonical data, with Markdown generated for indexing
  and export.
- Folders nest; trash uses soft deletion; snapshots are preserved.
- Files store private storage paths; signed URLs are generated server-side.
- Uploads are limited to 10 MB by default; set `MAX_UPLOAD_BYTES` (server-only)
  to change the limit. MIME type, size and filenames are validated on the server.
- Sharing is limited to individual notes with hashed, expiring invitation
  tokens; viewers read, editors edit, and owners invite/revoke.
- Note versions keep the latest 50 meaningful snapshots by default
  (`app.max_note_versions` database setting). Restoration adds a new version.
- Private files become readable to collaborators only when explicitly attached
  to a note shared with them.
- Commands are parsed by a safe application parser — never by an OS shell.
