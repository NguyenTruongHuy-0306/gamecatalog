"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

const RESEND_COOLDOWN = 30;
const MAX_RESENDS = 3;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCount, setResendCount] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start cooldown countdown whenever an email is sent
  useEffect(() => {
    if (!sent) return;
    setCountdown(RESEND_COOLDOWN);
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sent, resendCount]);

  const sendRequest = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Something went wrong. Please try again.");
      } else {
        setSent(true);
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendRequest();
  };

  const handleResend = async () => {
    if (countdown > 0 || resendCount >= MAX_RESENDS) return;
    setResendCount((c) => c + 1);
    await sendRequest();
  };

  return (
    <>
      <h1 className="text-2xl font-bold text-center mb-2">Reset Password</h1>
      <p className="text-sm text-muted-foreground text-center mb-6">
        Enter your email and we&apos;ll send a reset link.
      </p>

      {sent ? (
        <div className="space-y-4">
          <Alert>
            <AlertDescription className="text-center">
              If an account exists for <strong>{email}</strong>, you&apos;ll receive a reset link shortly.
            </AlertDescription>
          </Alert>

          {resendCount >= MAX_RESENDS ? (
            <Alert variant="destructive">
              <AlertDescription className="text-center text-sm">
                Too many resend attempts. Please wait a few minutes before trying again, or check your spam folder.
              </AlertDescription>
            </Alert>
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              {loading ? (
                "Sending…"
              ) : countdown > 0 ? (
                <>Resend link in <span className="font-medium tabular-nums">{countdown}s</span></>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  className="text-primary hover:underline font-medium"
                >
                  Resend reset link
                </button>
              )}
            </p>
          )}
        </div>
      ) : (
        <>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Sending…" : "Send Reset Link"}
            </Button>
          </form>
        </>
      )}

      <p className="text-center text-sm text-muted-foreground mt-6">
        <Link href="/login" className="text-primary hover:underline">
          Back to Sign In
        </Link>
      </p>
    </>
  );
}
