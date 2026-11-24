import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = {};
for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const match = line.match(/^([^#][^=]*)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
}
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const base = "http://localhost:2333";
const admin = createClient(url, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const anon = createClient(url, anonKey, { auth: { persistSession: false } });
const suffix = Date.now();
const users = {};
const sessions = {};
const clients = {};
const createdUsers = [];
let storagePath;
let noteId;

function report(label, ok, extra = "") {
  console.log(`${ok ? "PASS" : "FAIL"} ${label}${extra ? " :: " + extra : ""}`);
  if (!ok) process.exitCode = 1;
}

function cookie(who) {
  return `sb-${env.SUPABASE_PROJECT_REF}-auth-token=${encodeURIComponent(JSON.stringify(sessions[who]))}`;
}

async function cmd(who, command) {
  const response = await fetch(`${base}/api/commands`, {
    method: "POST",
    headers: { Cookie: cookie(who), "Content-Type": "application/json" },
    body: JSON.stringify({ command }),
  });
  return response.json();
}

async function waitForServer() {
  for (let i = 0; i < 30; i++) {
    try {
      if ((await fetch(`${base}/login`)).ok) return true;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return false;
}

async function makeUser(role) {
  const email = `${role}-${suffix}@example.com`;
  const password = `Share_${suffix}_${role}A1!`;
  const created = await admin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { display_name: role },
  });
  if (created.error) throw created.error;
  createdUsers.push(created.data.user.id);
  const signed = await anon.auth.signInWithPassword({ email, password });
  if (signed.error) throw signed.error;
  users[role] = email;
  sessions[role] = signed.data.session;
  clients[role] = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${signed.data.session.access_token}` } },
    auth: { persistSession: false },
  });
}

(async () => {
  try {
    report("dev server ready", await waitForServer());
    for (const role of ["owner", "viewer", "editor", "other"]) await makeUser(role);

    const workspace = await admin.from("workspaces").select("id").eq("owner_id", createdUsers[0]).maybeSingle();
    const workspaceId = workspace.data?.id;
    report("owner workspace created", Boolean(workspaceId));

    const note = await clients.owner.from("notes").insert({
      workspace_id: workspaceId,
      title: "Shared verification note",
      content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "secret" }] }] },
      markdown: "secret",
      word_count: 1,
    }).select("id").single();
    noteId = note.data?.id;
    report("owner note created", Boolean(noteId), note.error?.message);

    const viewerInvite = await cmd("owner", `share invite ${noteId} --email ${users.viewer} --role viewer --expires 7`);
    const editorInvite = await cmd("owner", `share invite ${noteId} --email ${users.editor} --role editor`);
    report("viewer invited with hashed token", viewerInvite.ok === true && Boolean(viewerInvite.data?.token), viewerInvite.error?.message);
    report("editor invited", editorInvite.ok === true && Boolean(editorInvite.data?.token), editorInvite.error?.message);
    const viewerShareId = viewerInvite.data?.shareId;

    const acceptViewer = await cmd("viewer", `share accept ${viewerInvite.data?.token}`);
    const acceptEditor = await cmd("editor", `share accept ${editorInvite.data?.token}`);
    report("viewer accepted invitation", acceptViewer.ok === true, acceptViewer.error?.message);
    report("editor accepted invitation", acceptEditor.ok === true, acceptEditor.error?.message);

    const viewerRead = await clients.viewer.from("notes").select("id").eq("id", noteId);
    const editorRead = await clients.editor.from("notes").select("id").eq("id", noteId);
    const otherRead = await clients.other.from("notes").select("id").eq("id", noteId);
    const ownerRead = await clients.owner.from("notes").select("id").eq("id", noteId);
    report("viewer can read shared note", (viewerRead.data ?? []).length === 1);
    report("editor can read shared note", (editorRead.data ?? []).length === 1);
    report("unrelated user cannot read note", (otherRead.data ?? []).length === 0);
    report("owner retains access", (ownerRead.data ?? []).length === 1);

    const viewerWrite = await clients.viewer.from("notes").update({ title: "Illegal edit" }).eq("id", noteId).select("id");
    report("viewer cannot edit", (viewerWrite.data ?? []).length === 0);

    const editorWrite = await clients.editor.from("notes").update({ title: "Editor edit" }).eq("id", noteId).select("id");
    report("editor can edit", (editorWrite.data ?? []).length === 1, editorWrite.error?.message);

    const versions = await clients.owner.from("note_versions").select("id").eq("note_id", noteId);
    const oldVersion = versions.data?.[0]?.id;
    report("versions recorded", (versions.data ?? []).length >= 1, `${versions.data?.length ?? 0}`);

    const restored = await cmd("owner", `history restore ${noteId} ${oldVersion}`);
    const versionsAfter = await clients.owner.from("note_versions").select("id").eq("note_id", noteId);
    report("restore creates a new version", restored.ok === true && (versionsAfter.data?.length ?? 0) > (versions.data?.length ?? 0), restored.error?.message);
    report("historical record preserved", versionsAfter.data?.some((row) => row.id === oldVersion) === true);

    storagePath = `${createdUsers[0]}/${workspaceId}/${crypto.randomUUID()}-shared.txt`;
    await clients.owner.storage.from("note-files").upload(storagePath, "shared body", { contentType: "text/plain" });
    const visibleWorkspace = await clients.owner.from("workspaces").select("id,owner_id").eq("id", workspaceId).maybeSingle();
    report("owner sees own workspace", Boolean(visibleWorkspace.data?.id), JSON.stringify(visibleWorkspace.error ?? {}));
    const fileInsert = await clients.owner.from("files").insert({
      workspace_id: workspaceId, name: "shared.txt", storage_path: storagePath,
      mime_type: "text/plain", size_bytes: 11, kind: "document",
    });
    report("file metadata insert", !fileInsert.error, JSON.stringify(fileInsert.error ?? {}));
    const fileRows = await clients.owner.from("files").select("id").eq("storage_path", storagePath).maybeSingle();
    const file = { data: fileRows.data, error: fileRows.error };
    report("file uploaded", Boolean(file.data?.id), file.error?.message);

    if (file.data?.id) {
      const fileBefore = await clients.editor.from("files").select("id").eq("id", file.data.id);
      report("file private before explicit attachment", (fileBefore.data ?? []).length === 0);

      const attach = await cmd("owner", `share attach ${noteId} ${file.data.id}`);
      report("file explicitly attached", attach.ok === true, attach.error?.message);
      const fileAfter = await clients.editor.from("files").select("id").eq("id", file.data.id);
      const fileOther = await clients.other.from("files").select("id").eq("id", file.data.id);
      report("editor can read attached file", (fileAfter.data ?? []).length === 1);
      report("unrelated user cannot read attached file", (fileOther.data ?? []).length === 0);
    }

    const revoke = await cmd("owner", `share revoke ${viewerShareId} --yes`);
    report("owner revoked viewer", revoke.ok === true, revoke.error?.message);
    const viewerAfter = await clients.viewer.from("notes").select("id").eq("id", noteId);
    report("revoked viewer loses access", (viewerAfter.data ?? []).length === 0);

    const unrelatedAccept = await cmd("other", `share accept ${editorInvite.data?.token}`);
    report("unrelated user cannot accept another's invitation", unrelatedAccept.ok === false);
  } catch (error) {
    report("verification run", false, error.message);
  } finally {
    if (storagePath) await admin.storage.from("note-files").remove([storagePath]);
    for (const id of createdUsers) {
      const { error } = await admin.auth.admin.deleteUser(id);
      report(`deleted test user ${id.slice(0, 8)}`, !error, error?.message);
    }
  }
})();
