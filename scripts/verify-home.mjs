import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = {};
for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const match = line.match(/^([^#][^=]*)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
}
const base = "http://localhost:2333";
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const suffix = Date.now();
const email = `home-${suffix}@example.com`;
const password = `Home_${suffix}A1!`;
const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
const signed = await anon.auth.signInWithPassword({ email, password });
const cookie = `sb-${env.SUPABASE_PROJECT_REF}-auth-token=${encodeURIComponent(JSON.stringify(signed.data.session))}`;

try {
  const response = await fetch(base, { headers: { Cookie: cookie } });
  const html = await response.text();
  const checks = {
    status: response.status === 200,
    wordmark: html.includes("TERMNOTE"),
    placeholder: html.includes("Ask anything or enter a command"),
    plusMenu: html.includes("Open action launcher"),
    submit: html.includes("Run command"),
    statusRow: html.includes("Connected") || html.includes("Setup required"),
    noDominantSidebar: !html.includes("All Notes</span>"),
    newAccent: html.includes("text-term-accent"),
    profileMenu: html.includes("Profile menu"),
    largeWordmark: html.includes("text-5xl") && html.includes("text-6xl"),
  };
  for (const [label, ok] of Object.entries(checks)) console.log(`${ok ? "PASS" : "FAIL"} ${label}`);
} finally {
  await admin.auth.admin.deleteUser(created.data.user.id);
}
