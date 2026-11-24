-- Preserved snapshots of note content. Never updated or deleted by the app.

create table if not exists public.note_versions (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  content jsonb not null,
  markdown text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists note_versions_note_id_idx on public.note_versions(note_id, created_at desc);

create or replace function public.snapshot_note_version()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.content is distinct from old.content or new.title is distinct from old.title then
    insert into public.note_versions (note_id, author_id, content, markdown)
    values (new.id, auth.uid(), old.content, old.markdown);
  end if;
  return new;
end;
$$;

drop trigger if exists notes_snapshot_version on public.notes;
create trigger notes_snapshot_version
after update on public.notes
for each row execute function public.snapshot_note_version();

alter table public.note_versions enable row level security;

drop policy if exists "note_versions_select_own" on public.note_versions;
create policy "note_versions_select_own" on public.note_versions
for select to authenticated using (public.owns_note(note_id));

drop policy if exists "note_versions_insert_own" on public.note_versions;
create policy "note_versions_insert_own" on public.note_versions
for insert to authenticated with check (public.owns_note(note_id));
