-- Starred items support both notes and files, scoped to a user and workspace.

create table if not exists public.starred_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  target_type text not null check (target_type in ('note','file')),
  target_id uuid not null,
  created_at timestamptz not null default now(),
  unique (user_id, target_type, target_id)
);

create index if not exists starred_items_user_id_idx on public.starred_items(user_id);

alter table public.starred_items enable row level security;

drop policy if exists "starred_items_select_own" on public.starred_items;
create policy "starred_items_select_own" on public.starred_items
for select to authenticated using (user_id = auth.uid() and public.owns_workspace(workspace_id));

drop policy if exists "starred_items_insert_own" on public.starred_items;
create policy "starred_items_insert_own" on public.starred_items
for insert to authenticated with check (user_id = auth.uid() and public.owns_workspace(workspace_id));

drop policy if exists "starred_items_delete_own" on public.starred_items;
create policy "starred_items_delete_own" on public.starred_items
for delete to authenticated using (user_id = auth.uid() and public.owns_workspace(workspace_id));
