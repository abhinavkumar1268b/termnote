-- Soft-deleted notes must not be readable through a share, and invitation
-- tokens are strictly one-time use.

create or replace function public.can_read_note(p_note_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.notes n
    where n.id = p_note_id
      and n.deleted_at is null
      and (
        public.owns_workspace(n.workspace_id)
        or exists (
          select 1 from public.note_shares s
          where s.note_id = n.id
            and lower(s.collaborator_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
            and (s.expires_at is null or s.expires_at > now())
        )
      )
  );
$$;

create or replace function public.can_edit_note(p_note_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.notes n
    join public.note_shares s on s.note_id = n.id
    where n.id = p_note_id
      and n.deleted_at is null
      and s.permission = 'editor'
      and lower(s.collaborator_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and (s.expires_at is null or s.expires_at > now())
  );
$$;

-- Clearing the hash on acceptance makes token reuse impossible.
create or replace function public.consume_invitation_token()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.collaborator_id is not null and old.collaborator_id is null then
    new.token_hash := null;
  end if;
  return new;
end;
$$;

drop trigger if exists note_shares_consume_token on public.note_shares;
create trigger note_shares_consume_token
before update on public.note_shares
for each row execute function public.consume_invitation_token();
