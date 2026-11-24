# Database migrations

Supabase migrations live in this folder. Each migration must be:

- applied through the Supabase CLI (`supabase db push`) or the dashboard,
- reversible where practical,
- paired with matching RLS policies for any new table,
- reviewed for service-role exposure before merging.

No migrations have been added yet — the schema is implemented in a later phase.
