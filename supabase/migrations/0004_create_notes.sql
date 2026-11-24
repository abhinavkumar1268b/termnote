-- Notes: Tiptap JSON is canonical; markdown is generated for indexing/export.

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  folder_id uuid references public.folders(id) on delete set null,
  title text not null default 'Untitled note' check (char_length(title) <= 200),
  content jsonb not null default '{"type":"doc","content":[]}'::jsonb,
  markdown text not null default '',
  word_count integer not null default 0 check (word_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists notes_workspace_id_idx on public.notes(workspace_id);
create index if not exists notes_folder_id_idx on public.notes(folder_id);
create index if not exists notes_updated_at_idx on public.notes(updated_at desc);

drop trigger if exists notes_set_updated_at on public.notes;
create trigger notes_set_updated_at
before update on public.notes
for each row execute function public.set_updated_at();

create or replace function public.owns_note(p_note_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.notes n
    where n.id = p_note_id and public.owns_workspace(n.workspace_id)
  );
$$;

revoke all on function public.owns_note(uuid) from public;
grant execute on function public.owns_note(uuid) to authenticated;

alter table public.notes enable row level security;

drop policy if exists "notes_select_own" on public.notes;
create policy "notes_select_own" on public.notes
for select to authenticated using (public.owns_workspace(workspace_id));

drop policy if exists "notes_insert_own" on public.notes;
create policy "notes_insert_own" on public.notes
for insert to authenticated with check (public.owns_workspace(workspace_id));

drop policy if exists "notes_update_own" on public.notes;
create policy "notes_update_own" on public.notes
for update to authenticated using (public.owns_workspace(workspace_id)) with check (public.owns_workspace(workspace_id));

drop policy if exists "notes_delete_own" on public.notes;
create policy "notes_delete_own" on public.notes
for delete to authenticated using (public.owns_workspace(workspace_id));
