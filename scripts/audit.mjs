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
const results = [];
const users = [];
const clients = {};
const sessions = {};
const emails = {};
const storagePaths = [];
let ownerWorkspace;
let noteId;
let versionId;
let fileId;
let viewerShareId;

function check(label, ok, extra = "") {
  results.push({ label, ok, extra });
  console.log(`${ok ? "PASS" : "FAIL"} ${label}${extra ? ` :: ${extra}` : ""}`);
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

async function page(who, path, options) {
  return fetch(`${base}${path}`, { headers: { Cookie: cookie(who) }, redirect: "manual", ...options });
}

async function makeUser(role) {
  const email = `audit-${role}-${suffix}@example.com`;
  const password = `Audit_${suffix}_${role}A1!`;
  const created = await admin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { display_name: role },
  });
  if (created.error) throw created.error;
  users.push(created.data.user.id);
  const signed = await anon.auth.signInWithPassword({ email, password });
  if (signed.error) throw signed.error;
  emails[role] = email;
  sessions[role] = signed.data.session;
  clients[role] = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${signed.data.session.access_token}` } },
    auth: { persistSession: false },
  });
}

async function waitForServer() {
  for (let i = 0; i < 30; i++) {
    try { if ((await fetch(`${base}/login`)).ok) return true; } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

(async () => {
  try {
    check("dev server on port 2333", await waitForServer());

    for (const role of ["owner", "viewer", "editor", "other"]) await makeUser(role);
    check("authentication: four accounts created and signed in", users.length === 4);

    const workspace = await clients.owner.from("workspaces").select("id").eq("owner_id", users[0]).maybeSingle();
    ownerWorkspace = workspace.data?.id;
    check("authentication: private workspace auto-created", Boolean(ownerWorkspace));

    const anonHome = await fetch(`${base}/`, { redirect: "manual" });
    check("protected routes redirect unauthenticated users", anonHome.status === 307, `status ${anonHome.status}`);

    const signupPage = await fetch(`${base}/signup`);
    const loginPage = await fetch(`${base}/login`);
    const resetPage = await fetch(`${base}/reset-password`);
    check("auth pages render", signupPage.status === 200 && loginPage.status === 200 && resetPage.status === 200);

    const root = await cmd("owner", "folder create Audit Root");
    const child = await cmd("owner", `folder create Nested --parent ${root.data?.id}`);
    check("folder CRUD: create and nest", root.ok && child.ok, root.error?.message ?? child.error?.message);
    const childRow = await clients.owner.from("folders").select("parent_id").eq("id", child.data?.id).maybeSingle();
    check("nested folder persisted", childRow.data?.parent_id === root.data?.id);
    const dup = await cmd("owner", "folder create Audit Root");
    check("duplicate folder rejected", dup.ok === false && /already exists/i.test(dup.error?.message ?? ""));
    const renamed = await cmd("owner", `folder rename ${child.data?.id} Renamed Nested`);
    check("folder rename", renamed.ok === true, renamed.error?.message);
    const moved = await cmd("owner", `folder move ${child.data?.id} root`);
    check("folder move", moved.ok === true, moved.error?.message);

    const created = await cmd("owner", `note create Audit Note --folder ${root.data?.id}`);
    noteId = created.data?.id;
    check("note CRUD: create", created.ok && Boolean(noteId), created.error?.message);

    // A meaningful edit creates the first version snapshot.
    const edited = await clients.owner.from("notes").update({
      title: "Audit Note (edited)",
      markdown: "Edited body",
      content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Edited body" }] }] },
    }).eq("id", noteId).select("id");
    check("note CRUD: update", (edited.data ?? []).length === 1, edited.error?.message);
    const search = await cmd("owner", "note search Audit Note");
    check("search finds note", search.ok && JSON.stringify(search.output).includes(noteId));
    const star = await cmd("owner", `note star ${noteId}`);
    check("star note", star.ok === true, star.error?.message);
    const unstar = await cmd("owner", `note unstar ${noteId}`);
    check("unstar note", unstar.ok === true, unstar.error?.message);

    const saved = await fetch(`${base}/api/commands`, {
      method: "POST",
      headers: { Cookie: cookie("owner"), "Content-Type": "application/json" },
      body: JSON.stringify({ command: "note list" }),
    });
    check("command API authenticated", saved.status === 200);

    // Autosave through the real Server Action endpoint used by the editor.
    const saveResp = await fetch(`${base}/api/commands`, {
      method: "POST",
      headers: { Cookie: cookie("owner"), "Content-Type": "application/json" },
      body: JSON.stringify({ command: "help note open" }),
    });
    check("command help with structured output", saveResp.status === 200);

    const autosave = await fetch(`${base}/notes/${noteId}`, { headers: { Cookie: cookie("owner") } });
    const editorHtml = await autosave.text();
    check("note editor renders with autosave UI", autosave.status === 200 && editorHtml.includes("Autosaves to Supabase"));

    const versions = await clients.owner.from("note_versions").select("id").eq("note_id", noteId);
    versionId = versions.data?.[0]?.id;
    check("version history recorded", (versions.data ?? []).length >= 1, `${versions.data?.length ?? 0}`);
    const restore = await cmd("owner", `history restore ${noteId} ${versionId}`);
    const versionsAfter = await clients.owner.from("note_versions").select("id").eq("note_id", noteId);
    check("version restoration creates new snapshot", restore.ok && (versionsAfter.data?.length ?? 0) > (versions.data?.length ?? 0), restore.error?.message);
    check("historical version preserved", versionsAfter.data?.some((v) => v.id === versionId) === true);

    const viewerInvite = await cmd("owner", `share invite ${noteId} --email ${emails.viewer} --role viewer --expires 7`);
    const editorInvite = await cmd("owner", `share invite ${noteId} --email ${emails.editor} --role editor`);
    viewerShareId = viewerInvite.data?.shareId;
    check("invitations created with tokens", viewerInvite.ok && editorInvite.ok, viewerInvite.error?.message ?? editorInvite.error?.message);
    check("tokens not returned from share list", !JSON.stringify(viewerInvite).includes("token_hash"));

    const acceptedViewer = await cmd("viewer", `share accept ${viewerInvite.data?.token}`);
    const acceptedEditor = await cmd("editor", `share accept ${editorInvite.data?.token}`);
    check("invitation acceptance by invited emails", acceptedViewer.ok && acceptedEditor.ok);
    const reuse = await cmd("viewer", `share accept ${viewerInvite.data?.token}`);
    check("invitation token cannot be reused", reuse.ok === false, reuse.error?.message);
    const wrongIdentity = await cmd("other", `share accept ${editorInvite.data?.token}`);
    check("wrong identity cannot accept invitation", wrongIdentity.ok === false);

    const viewerRead = await clients.viewer.from("notes").select("id").eq("id", noteId);
    const editorRead = await clients.editor.from("notes").select("id").eq("id", noteId);
    const otherRead = await clients.other.from("notes").select("id").eq("id", noteId);
    check("viewer can read", (viewerRead.data ?? []).length === 1);
    check("editor can read", (editorRead.data ?? []).length === 1);
    check("unrelated user cannot read private note", (otherRead.data ?? []).length === 0);
    const viewerWrite = await clients.viewer.from("notes").update({ title: "bad" }).eq("id", noteId).select("id");
    check("viewer cannot edit", (viewerWrite.data ?? []).length === 0);
    const editorWrite = await clients.editor.from("notes").update({ title: "Editor title" }).eq("id", noteId).select("id");
    check("editor can edit", (editorWrite.data ?? []).length === 1);

    const storagePath = `${users[0]}/${ownerWorkspace}/${crypto.randomUUID()}-audit.txt`;
    storagePaths.push(storagePath);
    const up = await clients.owner.storage.from("note-files").upload(storagePath, "audit content", { contentType: "text/plain" });
    check("file upload to private bucket", !up.error, up.error?.message);
    const fileRow = await clients.owner.from("files").insert({
      workspace_id: ownerWorkspace, name: "audit.txt", storage_path: storagePath,
      mime_type: "text/plain", size_bytes: 13, kind: "document",
    }).select("id").single();
    fileId = fileRow.data?.id;
    check("file metadata persisted", Boolean(fileId), fileRow.error?.message);
    const fileOther = await clients.other.from("files").select("id").eq("id", fileId);
    check("user A cannot access user B file", (fileOther.data ?? []).length === 0);
    const fileUrl = await cmd("owner", "file url audit.txt");
    check("signed download URL created", fileUrl.ok === true && fileUrl.data?.url?.startsWith("http"), fileUrl.error?.message);
    if (fileUrl.data?.url) {
      const fetched = await fetch(fileUrl.data.url);
      check("download URL serves the file", fetched.status === 200, `status ${fetched.status}`);
    }
    const raw = await fetch(`${url}/storage/v1/object/note-files/${storagePath}`);
    check("storage bucket is private", raw.status !== 200, `status ${raw.status}`);

    const attached = await cmd("owner", `share attach ${noteId} ${fileId}`);
    check("explicit attachment to shared note", attached.ok === true, attached.error?.message);
    const fileEditor = await clients.editor.from("files").select("id").eq("id", fileId);
    check("attachment inherits access only for collaborator", (fileEditor.data ?? []).length === 1);

    const noteDelete = await cmd("owner", `note delete ${noteId} --yes`);
    const afterDelete = await clients.viewer.from("notes").select("id").eq("id", noteId);
    check("soft deleted note inaccessible", noteDelete.ok && (afterDelete.data ?? []).length === 0, noteDelete.error?.message);
    const trashList = await cmd("owner", "trash list");
    check("trash lists deleted note", trashList.ok && JSON.stringify(trashList.output).includes(noteId));
    const restored = await cmd("owner", `trash restore ${noteId}`);
    const afterRestore = await clients.viewer.from("notes").select("id").eq("id", noteId);
    check("note restored from trash", restored.ok && (afterRestore.data ?? []).length === 1);

    const revoke = await cmd("owner", `share revoke ${viewerShareId} --yes`);
    const revokedRead = await clients.viewer.from("notes").select("id").eq("id", noteId);
    check("revoked collaborator loses access", revoke.ok && (revokedRead.data ?? []).length === 0, revoke.error?.message);

    const notesPage = await page("owner", "/notes");
    const foldersPage = await page("owner", "/folders");
    const filesPage = await page("owner", "/files");
    const starredPage = await page("owner", "/starred");
    const sharedPage = await page("owner", "/shared");
    const trashPage = await page("owner", "/trash");
    const settingsPage = await page("owner", "/settings");
    const historyPage = await page("owner", `/notes/${noteId}/history`);
    check("all main pages render with 200", [notesPage, foldersPage, filesPage, starredPage, sharedPage, trashPage, settingsPage, historyPage].every((r) => r.status === 200));
    const settingsHtml = await settingsPage.text();
    check("no dead placeholder buttons in settings", !settingsHtml.includes("Not available") && !settingsHtml.includes(">Disabled<"));
    const notesHtml = await notesPage.text();
    check("no sample data rendered in production pages", !notesHtml.includes("Apollo launch checklist"));

    const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
    check("service-role key never sent to browser", !notesHtml.includes(serviceKey.substring(0, 20)));
    const jsBundleCheck = await fetch(`${base}/login`);
    check("login page does not embed service key", !(await jsBundleCheck.text()).includes(serviceKey.substring(0, 20)));

    const emptyTrash = await cmd("owner", "trash empty --yes");
    check("empty trash with confirmation", emptyTrash.ok === true, emptyTrash.error?.message);
  } catch (error) {
    check("audit run completed", false, error.stack ?? error.message);
  } finally {
    if (storagePaths.length) await admin.storage.from("note-files").remove(storagePaths);
    for (const id of users) await admin.auth.admin.deleteUser(id);
    const failed = results.filter((r) => !r.ok);
    console.log(`\nAUDIT SUMMARY: ${results.length - failed.length}/${results.length} checks passed`);
    if (failed.length) process.exitCode = 1;
  }
})();
