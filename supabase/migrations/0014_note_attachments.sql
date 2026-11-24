-- A private file becomes readable to a note collaborator only when explicitly
-- attached to that shared note.

create table if not exists public.note_attachments (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes(id) on delete cascade,
  file_id uuid not null references public.files(id) on delete cascade,
  granted_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (note_id, file_id)
);

create or replace function public.can_read_file(p_file_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.files f
    where f.id = p_file_id and public.owns_workspace(f.workspace_id)
  ) or exists (
    select 1 from public.note_attachments a
    where a.file_id = p_file_id and public.can_read_note(a.note_id)
  );
$$;

revoke all on function public.can_read_file(uuid) from public;
grant execute on function public.can_read_file(uuid) to authenticated;

alter table public.note_attachments enable row level security;

drop policy if exists "note_attachments_select" on public.note_attachments;
create policy "note_attachments_select" on public.note_attachments
for select to authenticated using (public.can_read_note(note_id));

drop policy if exists "note_attachments_insert" on public.note_attachments;
create policy "note_attachments_insert" on public.note_attachments
for insert to authenticated
with check ((public.owns_note(note_id) or public.can_edit_note(note_id)) and granted_by = auth.uid());

drop policy if exists "note_attachments_delete" on public.note_attachments;
create policy "note_attachments_delete" on public.note_attachments
for delete to authenticated using (public.owns_note(note_id));

drop policy if exists "files_select_own" on public.files;
create policy "files_select_own" on public.files
for select to authenticated using (public.can_read_file(id));
