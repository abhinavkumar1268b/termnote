import { AcceptInvitationForm } from "@/features/sharing/components/accept-invitation-form";

export const metadata = { title: "Accept invitation — TermNote" };
export const dynamic = "force-dynamic";

export default async function AcceptInvitationPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;
  return <AcceptInvitationForm token={token} />;
}
