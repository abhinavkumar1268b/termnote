# Verification scripts

One-off smoke tests used against a real Supabase project. They read credentials
from `.env.local` and use the service-role key **only** to create and delete
temporary test users. They are not part of the application runtime.

Run from the project root:

```bash
node scripts/verify-database.mjs
node scripts/verify-app.mjs
node scripts/verify-library.mjs
node scripts/verify-sharing.mjs
node scripts/audit.mjs
```

`verify-app.mjs` expects the dev server on `http://localhost:2333` (change
`base` in the file if your port differs).

`audit.mjs` is the full functional/security integration suite: it creates four
throwaway users and exercises auth, CRUD, nesting, versions, sharing, storage,
RLS isolation, token reuse, deletion/recovery and page rendering.

All scripts delete the users and storage objects they create. Do not run them
against a production project with real user data unless you understand the
admin API calls involved. Point `base` at the target origin before running.
