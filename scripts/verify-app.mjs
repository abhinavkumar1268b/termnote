import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = {};
for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const match = line.match(/^([^#][^=]*)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
}
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const admin = createClient(url, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const anon = createClient(url, anonKey, { auth: { persistSession: false } });
const ref = env.SUPABASE_PROJECT_REF;
const suffix = Date.now();
const email = `appverify+${suffix}@example.com`;
const password = `AppVerify_${suffix}A1!`;
const base = "http://localhost:2333";
let userId;

function report(label, ok, extra = "") {
  console.log(`${ok ? "PASS" : "FAIL"} ${label}${extra ? " :: " + extra : ""}`);
  if (!ok) process.exitCode = 1;
}

async function waitForServer() {
  for (let i = 0; i < 30; i++) {
    try {
      const response = await fetch(`${base}/login`);
      if (response.ok) return true;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return false;
}

(async () => {
  try {
    report("dev server ready", await waitForServer());

    const { data: user, error: createError } = await admin.auth.admin.createUser({
      email, password, email_confirm: true, user_metadata: { display_name: "App Verify" },
    });
    if (createError) throw createError;
    userId = user.user.id;

    const { data: workspace } = await admin.from("workspaces").select("id").eq("owner_id", userId).maybeSingle();
    report("workspace via trigger", Boolean(workspace?.id));

    const signed = await anon.auth.signInWithPassword({ email, password });
    if (signed.error) throw signed.error;

    const client = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${signed.data.session.access_token}` } },
      auth: { persistSession: false },
    });
    const note = await client.from("notes").insert({
      workspace_id: workspace.id,
      title: `App verification ${suffix}`,
      content: { type: "doc", content: [] },
      markdown: "verification body",
      word_count: 2,
    }).select("id").single();
    report("note inserted", Boolean(note.data?.id), note.error?.message);

    const cookieName = `sb-${ref}-auth-token`;
    const cookie = `${cookieName}=${encodeURIComponent(JSON.stringify(signed.data.session))}`;
    const headers = { Cookie: cookie };

    const notesPage = await fetch(`${base}/notes`, { headers });
    const notesHtml = await notesPage.text();
    report("GET /notes authenticated", notesPage.status === 200, `status ${notesPage.status}`);
    report("note title rendered from Supabase", notesHtml.includes(note.data.title));
    report("no setup notice when configured", !notesHtml.includes("Supabase is not configured"));

    const command = await fetch(`${base}/api/commands`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ command: "note list" }),
    });
    const result = await command.json();
    report("command API uses real services", result.ok === true && JSON.stringify(result).includes(note.data.id), JSON.stringify(result.output?.[1] ?? result.error?.message));

    const editorPage = await fetch(`${base}/notes/${note.data.id}`, { headers });
    const editorHtml = await editorPage.text();
    report("GET note editor authenticated", editorPage.status === 200);
    report("editor toolbar rendered", editorHtml.includes("Heading 1") && editorHtml.includes("Table") && editorHtml.includes("Export PDF"));
    report("editor shows canonical JSON notice", editorHtml.includes("Tiptap JSON is canonical"));

    const protectedPage = await fetch(`${base}/settings`, { headers });
    report("GET /settings authenticated", protectedPage.status === 200);

    const signedOut = await fetch(`${base}/notes`, { redirect: "manual" });
    report("unauthenticated request redirects", signedOut.status === 307 || signedOut.status === 302, `status ${signedOut.status}`);
  } catch (error) {
    report("app verification run", false, error.message);
  } finally {
    if (userId) {
      const { error } = await admin.auth.admin.deleteUser(userId);
      report("deleted test user", !error, error?.message);
    }
  }
})();
