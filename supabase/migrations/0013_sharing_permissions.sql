-- Editors can edit an explicitly shared note; viewers remain read-only.

create or replace function public.can_edit_note(p_note_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.note_shares s
    where s.note_id = p_note_id
      and s.permission = 'editor'
      and lower(s.collaborator_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and (s.expires_at is null or s.expires_at > now())
  );
$$;

revoke all on function public.can_edit_note(uuid) from public;
grant execute on function public.can_edit_note(uuid) to authenticated;

drop policy if exists "notes_update_shared" on public.notes;
create policy "notes_update_shared" on public.notes
for update to authenticated
using (public.can_edit_note(id))
with check (public.can_edit_note(id));

drop policy if exists "note_versions_select_shared" on public.note_versions;
create policy "note_versions_select_shared" on public.note_versions
for select to authenticated
using (public.can_read_note(note_id));
