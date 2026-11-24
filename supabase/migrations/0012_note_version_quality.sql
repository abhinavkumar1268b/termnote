-- Meaningful snapshots with title, plus configurable retention (default 50).

alter table public.note_versions add column if not exists title text not null default '';

create or replace function public.snapshot_note_version()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.content is distinct from old.content
     or new.markdown is distinct from old.markdown
     or new.title is distinct from old.title then
    insert into public.note_versions (note_id, author_id, content, markdown, title)
    values (new.id, auth.uid(), old.content, old.markdown, old.title);
  end if;
  return new;
end;
$$;

create or replace function public.prune_note_versions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  max_versions integer;
begin
  max_versions := coalesce(nullif(current_setting('app.max_note_versions', true), '')::integer, 50);
  delete from public.note_versions v
  where v.note_id = new.note_id
    and v.id not in (
      select id from public.note_versions
      where note_id = new.note_id
      order by created_at desc, id desc
      limit greatest(max_versions, 1)
    );
  return new;
end;
$$;

drop trigger if exists note_versions_prune on public.note_versions;
create trigger note_versions_prune
after insert on public.note_versions
for each row execute function public.prune_note_versions();
