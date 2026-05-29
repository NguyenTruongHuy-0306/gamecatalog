"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    token ? "loading" : "error"
  );
  const [message, setMessage] = useState(
    token ? "" : "No verification token provided."
  );

  useEffect(() => {
    if (!token) return;

    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.message) {
          setStatus("success");
          setMessage(data.message);
          setTimeout(() => router.push("/login"), 3000);
        } else {
          setStatus("error");
          setMessage(data.error ?? "Verification failed.");
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("An error occurred. Please try again.");
      });
  }, [token, router]);

  if (status === "loading") {
    return (
      <div className="flex flex-col items-center gap-4 py-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Verifying your email…</p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="flex flex-col items-center gap-4 text-center py-4">
        <CheckCircle className="h-12 w-12 text-green-500" />
        <div>
          <h2 className="font-semibold text-lg">Email Verified!</h2>
          <p className="text-sm text-muted-foreground">{message}</p>
          <p className="text-xs text-muted-foreground mt-1">Redirecting to login…</p>
        </div>
        <Button render={<Link href="/login" />} className="w-full">
          Sign In Now
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 text-center py-4">
      <XCircle className="h-12 w-12 text-destructive" />
      <div>
        <h2 className="font-semibold text-lg">Verification Failed</h2>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
      <Alert variant="destructive">
        <AlertDescription>
          The link may have expired. Please sign up again to receive a new verification email.
        </AlertDescription>
      </Alert>
      <Button render={<Link href="/signup" />} variant="outline" className="w-full">
        Back to Sign Up
      </Button>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
