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
const email = `library+${suffix}@example.com`;
const password = `Library_${suffix}A1!`;
let userId;
let workspaceId;
let storagePath;
const cookie = () => `sb-${env.SUPABASE_PROJECT_REF}-auth-token=${encodeURIComponent(JSON.stringify(session))}`;
let session;

function report(label, ok, extra = "") {
  console.log(`${ok ? "PASS" : "FAIL"} ${label}${extra ? " :: " + extra : ""}`);
  if (!ok) process.exitCode = 1;
}

async function cmd(command) {
  const response = await fetch(`${base}/api/commands`, {
    method: "POST",
    headers: { Cookie: cookie(), "Content-Type": "application/json" },
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

(async () => {
  try {
    report("dev server ready", await waitForServer());

    const created = await admin.auth.admin.createUser({
      email, password, email_confirm: true, user_metadata: { display_name: "Library Verify" },
    });
    if (created.error) throw created.error;
    userId = created.data.user.id;

    const workspace = await admin.from("workspaces").select("id").eq("owner_id", userId).maybeSingle();
    workspaceId = workspace.data?.id;
    report("private workspace created", Boolean(workspaceId));

    const signed = await anon.auth.signInWithPassword({ email, password });
    if (signed.error) throw signed.error;
    session = signed.data.session;

    const client = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${session.access_token}` } },
      auth: { persistSession: false },
    });

    const root = await cmd("folder create Library Root");
    const rootId = root.data?.id;
    report("create folder", root.ok === true && Boolean(rootId), root.error?.message);

    const duplicate = await cmd("folder create Library Root");
    report("duplicate folder name rejected", duplicate.ok === false && /already exists/i.test(duplicate.error?.message ?? ""), duplicate.error?.message);

    const child = await cmd(`folder create Child --parent ${rootId}`);
    const childId = child.data?.id;
    report("create nested folder", child.ok === true && Boolean(childId), child.error?.message);
    const childRow = await client.from("folders").select("parent_id").eq("id", childId).maybeSingle();
    report("nesting persisted", childRow.data?.parent_id === rootId);

    const move = await cmd(`folder move ${childId} root`);
    report("move folder to root", move.ok === true, move.error?.message);
    const moved = await client.from("folders").select("parent_id").eq("id", childId).maybeSingle();
    report("move persisted", moved.data?.parent_id === null);

    const invalidMove = await cmd(`folder move ${rootId} ${rootId}`);
    report("folder self-move prevented", invalidMove.ok === false);

    const note = await cmd(`note create Test note --folder ${rootId}`);
    const noteId = note.data?.id;
    report("create note", note.ok === true && Boolean(noteId), note.error?.message);

    const search = await cmd('note search "Test note"');
    report("server note search", search.ok === true && JSON.stringify(search.output).includes(noteId));

    const star = await cmd(`note star ${noteId}`);
    const starCount = await client.from("starred_items").select("id").eq("target_id", noteId);
    report("star note", star.ok === true && (starCount.data ?? []).length === 1);

    const unstar = await cmd(`note unstar ${noteId}`);
    const unstarCount = await client.from("starred_items").select("id").eq("target_id", noteId);
    report("unstar note", unstar.ok === true && (unstarCount.data ?? []).length === 0);

    const blockedDelete = await cmd(`folder delete ${rootId} --yes`);
    report("non-empty folder deletion blocked", blockedDelete.ok === false && blockedDelete.error?.code === "CONFIRMATION_REQUIRED", blockedDelete.error?.message);

    const noteDelete = await cmd(`note delete ${noteId} --yes`);
    const deletedNote = await client.from("notes").select("deleted_at").eq("id", noteId).maybeSingle();
    report("soft-delete note", noteDelete.ok === true && Boolean(deletedNote.data?.deleted_at));

    const trash = await cmd("trash list");
    report("trash lists deleted note", trash.ok === true && JSON.stringify(trash.output).includes(noteId));

    const restored = await cmd(`trash restore ${noteId}`);
    const restoredNote = await client.from("notes").select("deleted_at").eq("id", noteId).maybeSingle();
    report("restore note from trash", restored.ok === true && restoredNote.data?.deleted_at === null, restored.error?.message);

    storagePath = `${userId}/${workspaceId}/${crypto.randomUUID()}-report.txt`;
    const upload = await client.storage.from("note-files").upload(storagePath, "private report body", { contentType: "text/plain" });
    report("private storage upload", !upload.error, upload.error?.message);
    const fileRow = await client.from("files").insert({
      workspace_id: workspaceId,
      folder_id: rootId,
      name: "report.txt",
      storage_path: storagePath,
      mime_type: "text/plain",
      size_bytes: 17,
      kind: "document",
    }).select("id").single();
    report("file metadata row created", Boolean(fileRow.data?.id), fileRow.error?.message);

    const fileUrl = await cmd("file url report.txt");
    const signedUrl = fileUrl.data?.url;
    report("signed URL created", fileUrl.ok === true && typeof signedUrl === "string", JSON.stringify(fileUrl).slice(0, 400));
    if (signedUrl) {
      const signedFetch = await fetch(signedUrl);
      report("signed URL serves private file", signedFetch.status === 200, `status ${signedFetch.status}`);
    }
    const publicFetch = await fetch(`${url}/storage/v1/object/note-files/${storagePath}`);
    report("raw private path is not public", publicFetch.status !== 200, `status ${publicFetch.status}`);

    const fileDelete = await cmd("file delete report.txt --yes");
    const deletedFile = await client.from("files").select("deleted_at").eq("id", fileRow.data.id).maybeSingle();
    report("soft-delete file", fileDelete.ok === true && Boolean(deletedFile.data?.deleted_at));

    const fileRestore = await cmd("file restore report.txt");
    const restoredFile = await client.from("files").select("deleted_at").eq("id", fileRow.data.id).maybeSingle();
    report("restore file", fileRestore.ok === true && restoredFile.data?.deleted_at === null, JSON.stringify(fileRestore).slice(0, 300));

    const emptyTrash = await cmd("trash empty --yes");
    report("empty trash with confirmation", emptyTrash.ok === true, emptyTrash.error?.message);
  } catch (error) {
    report("verification run", false, error.message);
  } finally {
    if (storagePath) await admin.storage.from("note-files").remove([storagePath]);
    if (userId) {
      const { error } = await admin.auth.admin.deleteUser(userId);
      report("deleted test user", !error, error?.message);
    }
  }
})();
