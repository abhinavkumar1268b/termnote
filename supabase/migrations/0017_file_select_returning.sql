-- INSERT ... RETURNING evaluates the SELECT policy on the new row. Checking
-- direct ownership first keeps owner inserts working while preserving
-- collaborator access to explicitly attached files.

drop policy if exists "files_select_own" on public.files;
create policy "files_select_own" on public.files
for select to authenticated
using (public.owns_workspace(workspace_id) or public.can_read_file(id));
