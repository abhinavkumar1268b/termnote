import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = {};
for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const match = line.match(/^([^#][^=]*)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
}
const base = process.env.AUDIT_BASE_URL ?? "http://localhost:2333";
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const suffix = Date.now();
const email = `settings-${suffix}@example.com`;
const password = `Settings_${suffix}A1!`;
const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
const signed = await anon.auth.signInWithPassword({ email, password });
const cookie = `sb-${env.SUPABASE_PROJECT_REF}-auth-token=${encodeURIComponent(JSON.stringify(signed.data.session))}`;

function check(label, ok, extra = "") {
  console.log(`${ok ? "PASS" : "FAIL"} ${label}${extra ? ` :: ${extra}` : ""}`);
}

try {
  const settings = await fetch(`${base}/settings`, { headers: { Cookie: cookie } });
  const html = await settings.text();
  check("settings page renders", settings.status === 200, `status ${settings.status}`);
  check("back button present", html.includes("Back to previous screen"));
  check("settings sidebar link active", html.includes('href="/settings"') && html.includes('aria-current="page"'));
  check("no command input on settings", !html.includes('aria-label="Command input"'));
  check("profile section", html.includes(">Profile<"));
  check("workspace section", html.includes(">Workspace<"));
  check("appearance section", html.includes(">Appearance<"));
  check("storage usage", html.includes("Storage usage"));
  check("privacy section", html.includes("Privacy and security"));
  check("data controls", html.includes("Data controls"));
  check("read-only profile labelled", html.includes("read only"));
  check("sign out available", html.includes("Sign out"));
  check("profile email displayed", html.includes(email));
} finally {
  await admin.auth.admin.deleteUser(created.data.user.id);
}
