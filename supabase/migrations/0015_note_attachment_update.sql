-- Upsert-style attachment writes also need an UPDATE policy under RLS.

drop policy if exists "note_attachments_update" on public.note_attachments;
create policy "note_attachments_update" on public.note_attachments
for update to authenticated
using (public.owns_note(note_id))
with check (public.owns_note(note_id) and granted_by = auth.uid());
