import { AuthForm, AuthPrivacyNote } from "@/features/auth/components/auth-form";

export const metadata = { title: "Sign in — TermNote" };

export default function LoginPage() {
  return (
    <>
      <AuthForm mode="login" />
      <AuthPrivacyNote />
    </>
  );
}
