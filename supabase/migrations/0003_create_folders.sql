-- Folders support nested hierarchies within a workspace.

create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  parent_id uuid references public.folders(id) on delete restrict,
  name text not null check (char_length(name) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists folders_workspace_id_idx on public.folders(workspace_id);
create index if not exists folders_parent_id_idx on public.folders(parent_id);

drop trigger if exists folders_set_updated_at on public.folders;
create trigger folders_set_updated_at
before update on public.folders
for each row execute function public.set_updated_at();

create or replace function public.validate_folder_parent()
returns trigger
language plpgsql
as $$
declare
  parent_workspace uuid;
begin
  if new.parent_id is null then return new; end if;
  if new.parent_id = new.id then
    raise exception 'A folder cannot be its own parent';
  end if;
  select workspace_id into parent_workspace from public.folders where id = new.parent_id;
  if parent_workspace is distinct from new.workspace_id then
    raise exception 'Parent folder must belong to the same workspace';
  end if;
  return new;
end;
$$;

drop trigger if exists folders_validate_parent on public.folders;
create trigger folders_validate_parent
before insert or update of parent_id on public.folders
for each row execute function public.validate_folder_parent();

alter table public.folders enable row level security;

drop policy if exists "folders_select_own" on public.folders;
create policy "folders_select_own" on public.folders
for select to authenticated using (public.owns_workspace(workspace_id));

drop policy if exists "folders_insert_own" on public.folders;
create policy "folders_insert_own" on public.folders
for insert to authenticated with check (public.owns_workspace(workspace_id));

drop policy if exists "folders_update_own" on public.folders;
create policy "folders_update_own" on public.folders
for update to authenticated using (public.owns_workspace(workspace_id)) with check (public.owns_workspace(workspace_id));

drop policy if exists "folders_delete_own" on public.folders;
create policy "folders_delete_own" on public.folders
for delete to authenticated using (public.owns_workspace(workspace_id));
