-- Sharing is limited to individual notes. Tokens are stored hashed only.

create table if not exists public.note_shares (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  collaborator_email text not null,
  collaborator_id uuid references public.profiles(id) on delete set null,
  permission text not null default 'viewer' check (permission in ('viewer','editor')),
  token_hash text unique,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique (note_id, collaborator_email)
);

create index if not exists note_shares_note_id_idx on public.note_shares(note_id);
create index if not exists note_shares_email_idx on public.note_shares(lower(collaborator_email));

create or replace function public.can_read_note(p_note_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.note_shares s
    where s.note_id = p_note_id
      and lower(s.collaborator_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and (s.expires_at is null or s.expires_at > now())
  );
$$;

revoke all on function public.can_read_note(uuid) from public;
grant execute on function public.can_read_note(uuid) to authenticated;

alter table public.note_shares enable row level security;

drop policy if exists "note_shares_owner_select" on public.note_shares;
create policy "note_shares_owner_select" on public.note_shares
for select to authenticated using (owner_id = auth.uid());

drop policy if exists "note_shares_collaborator_select" on public.note_shares;
create policy "note_shares_collaborator_select" on public.note_shares
for select to authenticated using (
  lower(collaborator_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

drop policy if exists "note_shares_owner_insert" on public.note_shares;
create policy "note_shares_owner_insert" on public.note_shares
for insert to authenticated with check (owner_id = auth.uid() and public.owns_note(note_id));

drop policy if exists "note_shares_owner_update" on public.note_shares;
create policy "note_shares_owner_update" on public.note_shares
for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "note_shares_owner_delete" on public.note_shares;
create policy "note_shares_owner_delete" on public.note_shares
for delete to authenticated using (owner_id = auth.uid());

-- Collaborators can read only the note that was explicitly shared with them.
drop policy if exists "notes_select_shared" on public.notes;
create policy "notes_select_shared" on public.notes
for select to authenticated using (public.can_read_note(id));
