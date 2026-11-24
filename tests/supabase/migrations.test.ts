import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationsDir = join(process.cwd(), "supabase", "migrations");
const files = readdirSync(migrationsDir).filter((file) => file.endsWith(".sql")).sort();
const sql = files.map((file) => readFileSync(join(migrationsDir, file), "utf-8")).join("\n");

const tables = [
  "profiles",
  "workspaces",
  "folders",
  "notes",
  "note_versions",
  "files",
  "starred_items",
  "note_shares",
  "activity_logs",
];

describe("Supabase migrations", () => {
  it("creates all nine approved tables", () => {
    for (const table of tables) {
      expect(sql).toContain(`create table if not exists public.${table} (`);
    }
  });

  it("enables RLS on all user-data tables", () => {
    for (const table of tables) {
      expect(sql).toContain(`alter table public.${table} enable row level security;`);
    }
  });

  it("defines ownership policies for every table", () => {
    for (const table of tables) {
      expect(sql).toContain(`on public.${table}`);
    }
    expect(sql).toContain("create policy \"notes_select_shared\"");
    expect(sql).toContain("create policy \"note_shares_collaborator_select\"");
  });

  it("keeps storage private and scoped to the user prefix", () => {
    expect(sql).toContain("'note-files', 'note-files', false");
    expect(sql).toContain("(storage.foldername(name))[1] = auth.uid()::text");
  });

  it("never grants service-role access in app code", () => {
    expect(sql).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });

  it("keeps 50 meaningful note versions by default", () => {
    expect(sql).toContain("note_versions_prune");
    expect(sql).toContain("app.max_note_versions");
    expect(sql).toContain("coalesce(nullif(current_setting('app.max_note_versions', true), '')::integer, 50)");
    expect(sql).toContain("new.markdown is distinct from old.markdown");
  });

  it("protects shared notes and explicit attachments with RLS", () => {
    expect(sql).toContain("can_edit_note");
    expect(sql).toContain("notes_update_shared");
    expect(sql).toContain("create table if not exists public.note_attachments");
    expect(sql).toContain("can_read_file");
  });

  it("protects one-time invitations and soft-deleted notes", () => {
    expect(sql).toContain("consume_invitation_token");
    expect(sql).toContain("note_shares_collaborator_accept");
    expect(sql).toContain("note_shares_consume_token");
    expect(sql).toContain("n.deleted_at is null");
    expect(sql).toContain("Collaborators may only claim their invitation");
  });

  it("creates the new-user workspace trigger", () => {
    expect(sql).toContain("create trigger on_auth_user_created");
    expect(sql).toContain("insert into public.workspaces (owner_id, name)");
  });
});
