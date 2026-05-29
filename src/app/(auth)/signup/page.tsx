import { SignupForm } from "@/components/auth/SignupForm";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Create Account" };

export default function SignupPage() {
  const googleEnabled = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  return (
    <>
      <h1 className="text-2xl font-bold text-center mb-6">Create your account</h1>
      <SignupForm googleEnabled={googleEnabled} />
    </>
  );
}
