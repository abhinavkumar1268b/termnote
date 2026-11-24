import { AuthForm, AuthPrivacyNote } from "@/features/auth/components/auth-form";

export const metadata = { title: "Create account — TermNote" };

export default function SignupPage() {
  return (
    <>
      <AuthForm mode="signup" />
      <AuthPrivacyNote />
    </>
  );
}
