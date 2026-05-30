"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";
import { StarRating } from "./StarRating";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import Link from "next/link";
import { apiError } from "@/lib/client-error";

interface ReviewFormProps {
  gameSlug: string;
  onSuccess?: () => void;
}

export function ReviewForm({ gameSlug, onSuccess }: ReviewFormProps) {
  const { data: session, status } = useSession();
  const { executeRecaptcha } = useGoogleReCaptcha();
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (status === "loading") return null;

  if (!session?.user) {
    return (
      <Alert>
        <AlertDescription>
          <Link href="/login" className="font-medium underline underline-offset-2">
            Sign in
          </Link>{" "}
          to write a review.
        </AlertDescription>
      </Alert>
    );
  }

  if (!session.user.emailVerified) {
    return (
      <Alert>
        <AlertDescription>
          Please{" "}
          <Link href="/verify-email" className="font-medium underline underline-offset-2">
            verify your email
          </Link>{" "}
          before writing reviews.
        </AlertDescription>
      </Alert>
    );
  }

  if (session.user.isBanned) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Your account has been suspended.</AlertDescription>
      </Alert>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (rating === 0) {
      setError("Please select a star rating.");
      return;
    }

    if (!executeRecaptcha) {
      setError("reCAPTCHA not ready. Please try again.");
      return;
    }

    setSubmitting(true);

    let captchaToken: string;
    try {
      captchaToken = await executeRecaptcha("submit_review");
    } catch {
      setError("reCAPTCHA verification failed. Please try again.");
      setSubmitting(false);
      return;
    }

    let res: Response;
    let data: { error?: string };
    try {
      res = await fetch(`/api/games/${gameSlug}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, body: body || undefined, captchaToken }),
      });
      data = await res.json();
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
      return;
    }

    setSubmitting(false);

    if (!res.ok) {
      if (res.status === 409) {
        setError("You have already reviewed this game.");
      } else {
        setError(apiError(data, "Failed to submit review."));
      }
      return;
    }

    toast.success("Review submitted!");
    setRating(0);
    setBody("");
    onSuccess?.();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border rounded-lg p-4">
      <h3 className="font-semibold">Write a Review</h3>

      <fieldset>
        <legend className="text-sm font-medium mb-1.5">Your Rating</legend>
        <StarRating value={rating} onChange={setRating} disabled={submitting} />
      </fieldset>

      <div>
        <label className="text-sm font-medium mb-1.5 block" htmlFor="review-body">
          Review (optional)
        </label>
        <Textarea
          id="review-body"
          placeholder="Share your thoughts about this game..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={2000}
          rows={4}
          disabled={submitting}
        />
        <p className="text-xs text-muted-foreground mt-1">{body.length}/2000</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" disabled={submitting || rating === 0} className="w-full">
        {submitting ? "Submitting…" : "Submit Review"}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        This site is protected by reCAPTCHA.
      </p>
    </form>
  );
}
