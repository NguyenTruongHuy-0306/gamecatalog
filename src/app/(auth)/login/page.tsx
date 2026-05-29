import { LoginForm } from "@/components/auth/LoginForm";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Sign In" };

export default function LoginPage() {
  const googleEnabled = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  return (
    <>
      <h1 className="text-2xl font-bold text-center mb-6">Welcome back</h1>
      <LoginForm googleEnabled={googleEnabled} />
    </>
  );
}
