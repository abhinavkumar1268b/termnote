-- Files hold metadata only. Bytes live in the private note-files storage bucket.

create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  folder_id uuid references public.folders(id) on delete set null,
  name text not null check (char_length(name) between 1 and 255),
  storage_path text not null unique,
  mime_type text not null default 'application/octet-stream',
  size_bytes bigint not null default 0 check (size_bytes >= 0),
  kind text not null default 'other' check (kind in ('document','image','spreadsheet','archive','other')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists files_workspace_id_idx on public.files(workspace_id);
create index if not exists files_folder_id_idx on public.files(folder_id);

drop trigger if exists files_set_updated_at on public.files;
create trigger files_set_updated_at
before update on public.files
for each row execute function public.set_updated_at();

alter table public.files enable row level security;

drop policy if exists "files_select_own" on public.files;
create policy "files_select_own" on public.files
for select to authenticated using (public.owns_workspace(workspace_id));

drop policy if exists "files_insert_own" on public.files;
create policy "files_insert_own" on public.files
for insert to authenticated with check (public.owns_workspace(workspace_id));

drop policy if exists "files_update_own" on public.files;
create policy "files_update_own" on public.files
for update to authenticated using (public.owns_workspace(workspace_id)) with check (public.owns_workspace(workspace_id));

drop policy if exists "files_delete_own" on public.files;
create policy "files_delete_own" on public.files
for delete to authenticated using (public.owns_workspace(workspace_id));
