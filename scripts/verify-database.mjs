import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = {};
for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const match = line.match(/^([^#][^=]*)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
}

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const anon = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
const suffix = Date.now();
const email = `verify+${suffix}@example.com`;
const password = `Verify_${suffix}A1!`;
const users = [];

function report(label, ok, extra = "") {
  console.log(`${ok ? "PASS" : "FAIL"} ${label}${extra ? " :: " + extra : ""}`);
  if (!ok) process.exitCode = 1;
}

async function createUser(mail) {
  const { data, error } = await admin.auth.admin.createUser({
    email: mail,
    password,
    email_confirm: true,
    user_metadata: { display_name: "Verification User" },
  });
  if (error) throw error;
  users.push(data.user.id);
  return data.user;
}

(async () => {
  let user;
  try {
    user = await createUser(email);
    report("admin created test user", Boolean(user.id));

    const profile = await admin.from("profiles").select("id").eq("id", user.id).maybeSingle();
    report("trigger created profile", Boolean(profile.data));

    const workspace = await admin.from("workspaces").select("id").eq("owner_id", user.id).maybeSingle();
    report("trigger created private workspace", Boolean(workspace.data));
    if (!workspace.data) throw new Error("no workspace created");

    const session = await anon.auth.signInWithPassword({ email, password });
    report("password sign-in", !session.error && Boolean(session.data.session));
    if (session.error) throw session.error;

    const client = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${session.data.session.access_token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const inserted = await client.from("notes").insert({
      workspace_id: workspace.data.id,
      title: "Verification note",
      content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "hello" }] }] },
      markdown: "hello",
      word_count: 1,
    }).select("id").single();
    report("insert note with RLS", !inserted.error && Boolean(inserted.data?.id), inserted.error?.message);
    if (!inserted.data) throw new Error("note insert failed");

    const readBack = await client.from("notes").select("title,markdown").eq("id", inserted.data.id).maybeSingle();
    report("read note back with RLS", readBack.data?.title === "Verification note");

    const updated = await client.from("notes").update({ title: "Updated verification note" }).eq("id", inserted.data.id).select("title").single();
    report("update note with RLS", updated.data?.title === "Updated verification note");

    const versions = await client.from("note_versions").select("id").eq("note_id", inserted.data.id);
    report("version snapshot trigger", (versions.data ?? []).length > 0, `${versions.data?.length ?? 0} snapshots`);

    await createUser(`verify-other-${suffix}@example.com`);
    const otherSession = await anon.auth.signInWithPassword({ email: `verify-other-${suffix}@example.com`, password });
    const otherClient = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${otherSession.data.session.access_token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const leaked = await otherClient.from("notes").select("id").eq("id", inserted.data.id);
    report("RLS blocks other user", (leaked.data ?? []).length === 0);

    const blockedUpdate = await otherClient
      .from("notes")
      .update({ title: "Unauthorised edit" })
      .eq("id", inserted.data.id)
      .select("id");
    report("RLS blocks other user edit", (blockedUpdate.data ?? []).length === 0, blockedUpdate.error?.message);

    const folders = await client.from("folders").insert({ workspace_id: workspace.data.id, name: "Verify folder" }).select("id").single();
    report("insert folder", !folders.error && Boolean(folders.data?.id), folders.error?.message);
  } catch (error) {
    report("verification run", false, error.message);
  } finally {
    for (const id of users) {
      const { error } = await admin.auth.admin.deleteUser(id);
      report(`delete test user ${id.slice(0, 8)}`, !error, error?.message);
    }
  }
})();
