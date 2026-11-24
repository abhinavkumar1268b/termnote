import { success } from "../errors";
import { fromAction } from "./library";
import { getCommandServices } from "../services";
import type { CommandContext, CommandResult } from "../types";

export async function handleShareList({ parsed }: CommandContext): Promise<CommandResult> {
  const role = typeof parsed.flags.role === "string" ? parsed.flags.role : undefined;
  const shares = await getCommandServices().sharing.list(role);

  return success("share list", [
    `${shares.length} active share(s):`,
    ...shares.map((share) => `  ${share.noteId}  ${share.title}  ${share.collaborator} <${share.email}>  ${share.permission}`),
    "Sharing is limited to individual notes.",
  ], { navigate: "/shared" });
}

export async function handleShareInfo({ parsed }: CommandContext): Promise<CommandResult> {
  const shares = await getCommandServices().sharing.get(parsed.args[0] ?? "");
  return success("share info", [
    shares.length === 0 ? "No shares for this note." : `${shares.length} share(s):`,
    ...shares.map((share) => `  ${share.collaborator} <${share.email}> · ${share.permission} · ${share.sharedLabel}`),
  ]);
}

/** Email and role are validated by the registry schemas before this runs. */
export async function handleShareInvite({ parsed }: CommandContext): Promise<CommandResult> {
  const email = String(parsed.flags.email ?? "");
  const role = String(parsed.flags.role ?? "viewer") as "viewer" | "editor";
  const expiresRaw = typeof parsed.flags.expires === "string" ? Number(parsed.flags.expires) : undefined;
  const result = await getCommandServices().mutations.invite(parsed.args[0] ?? "", email, role, expiresRaw);
  return fromAction("share invite", result, `Invitation created for ${email} as ${role}. Copy the token now; it is stored hashed.`);
}
