-- Invited collaborators must be able to claim their own invitation. Without
-- an UPDATE policy, PostgREST silently updates zero rows.

drop policy if exists "note_shares_collaborator_accept" on public.note_shares;
create policy "note_shares_collaborator_accept" on public.note_shares
for update to authenticated
using (
  lower(collaborator_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
)
with check (
  collaborator_id = auth.uid()
  and lower(collaborator_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

create or replace function public.guard_share_claim()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() = old.owner_id then
    return new;
  end if;

  if new.id <> old.id
     or new.note_id <> old.note_id
     or new.owner_id <> old.owner_id
     or new.collaborator_email <> old.collaborator_email
     or new.permission <> old.permission
     or new.expires_at is distinct from old.expires_at then
    raise exception 'Collaborators may only claim their invitation';
  end if;

  return new;
end;
$$;

drop trigger if exists note_shares_guard_claim on public.note_shares;
create trigger note_shares_guard_claim
before update on public.note_shares
for each row execute function public.guard_share_claim();
