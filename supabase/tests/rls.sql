-- pgTAP policy tests. Run with: supabase test db
-- Requires the Supabase local stack (see supabase/README.md).

begin;

select plan(14);

select tests.create_supabase_user('owner', 'owner@termnote.test');
select tests.create_supabase_user('other', 'other@termnote.test');
select tests.create_supabase_user('reader', 'reader@termnote.test');

-- 1. RLS is enabled on every user-data table.
select ok(
  (select bool_and(c.relrowsecurity) from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in ('profiles','workspaces','folders','notes','note_versions','files','starred_items','note_shares','activity_logs')),
  'RLS is enabled on all nine user-data tables'
);

select tests.authenticate_as('owner');

insert into public.workspaces (owner_id, name)
values (tests.get_supabase_uid('owner'), 'Owner workspace');

select is(
  (select count(*)::int from public.workspaces),
  1,
  'owner can see own workspace'
);

insert into public.folders (workspace_id, name)
values ((select id from public.workspaces limit 1), 'Private folder');

insert into public.notes (workspace_id, folder_id, title, content, markdown)
values (
  (select id from public.workspaces limit 1),
  (select id from public.folders limit 1),
  'Private note',
  '{"type":"doc","content":[]}'::jsonb,
  ''
);

select is(
  (select count(*)::int from public.notes),
  1,
  'owner can see own note'
);

select tests.authenticate_as('other');

select is(
  (select count(*)::int from public.workspaces),
  0,
  'other user cannot see owner workspace'
);

select is(
  (select count(*)::int from public.folders),
  0,
  'other user cannot see owner folder'
);

select is(
  (select count(*)::int from public.notes),
  0,
  'other user cannot see owner note'
);

select is(
  (select count(*)::int from public.note_versions),
  0,
  'other user cannot see owner note versions'
);

select is(
  (select count(*)::int from public.starred_items),
  0,
  'other user cannot see owner stars'
);

-- A shared note becomes visible to the invited email only.
select tests.authenticate_as('owner');

insert into public.note_shares (note_id, owner_id, collaborator_email, permission)
values (
  (select id from public.notes limit 1),
  tests.get_supabase_uid('owner'),
  'reader@termnote.test',
  'viewer'
);

select tests.authenticate_as('reader');

select is(
  (select count(*)::int from public.notes),
  1,
  'collaborator can read the explicitly shared note'
);

select is(
  (select count(*)::int from public.workspaces),
  0,
  'collaborator still cannot see the owner workspace'
);

select is(
  (select count(*)::int from public.note_shares),
  1,
  'collaborator can see their own share invitation'
);

-- Storage paths are private and scoped to the user prefix.
select tests.authenticate_as('other');

select is(
  (select count(*)::int from storage.objects
    where bucket_id = 'note-files'
      and (storage.foldername(name))[1] = tests.get_supabase_uid('owner')::text),
  0,
  'other user cannot list owner storage objects'
);

select is(
  (select count(*)::int from public.activity_logs),
  0,
  'other user cannot see owner activity logs'
);

select tests.authenticate_as('owner');

select is(
  (select count(*)::int from public.note_shares),
  1,
  'owner can see shares they created'
);

select is(
  (select count(*)::int from public.notes where deleted_at is null),
  1,
  'active notes remain visible (soft delete column present)'
);

select * from finish();
rollback;
