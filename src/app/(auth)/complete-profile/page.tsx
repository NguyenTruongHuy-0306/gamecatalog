import { CompleteProfileForm } from "@/components/auth/CompleteProfileForm";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Complete Your Profile" };

export default function CompleteProfilePage() {
  return (
    <>
      <h1 className="text-2xl font-bold text-center mb-2">Almost there!</h1>
      <p className="text-sm text-muted-foreground text-center mb-6">
        Your Google email is verified. Choose a username and password to finish setting up your account.
      </p>
      <CompleteProfileForm />
    </>
  );
}
