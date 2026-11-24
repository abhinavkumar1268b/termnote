# Mock data (test fixtures only)

These modules are **test fixtures** for the offline command-engine unit tests.
They are no longer used by any application route, page, Server Action or
client component. Production data always comes from Supabase via
`lib/data/queries.ts`, `app/library-actions.ts`, `app/sharing-actions.ts` and
`app/history-actions.ts`.

The command API (`/api/commands`) returns 503 when Supabase is not configured
instead of falling back to sample data.

Fixture modules: `notes.ts`, `folders.ts`, `files.ts`, `history.ts`, `shared.ts`,
`trash.ts`, `user.ts`. `commands.ts` is retained for compatibility with older
tests; the command console starts with an empty history.
