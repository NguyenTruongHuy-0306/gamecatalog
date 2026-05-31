"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  onVerified: (input: string, token: string) => void;
  onReset: () => void;
  disabled?: boolean;
}

export function CaptchaChallenge({ onVerified, onReset, disabled }: Props) {
  const [code, setCode] = useState("");
  const [token, setToken] = useState("");
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [verified, setVerified] = useState(false);

  const fetchCaptcha = useCallback(async () => {
    setFetching(true);
    setInput("");
    setError(false);
    setVerified(false);
    onReset();
    try {
      const res = await fetch("/api/auth/captcha");
      const data = await res.json();
      setCode(data.code);
      setToken(data.token);
    } finally {
      setFetching(false);
    }
  }, [onReset]);

  useEffect(() => { fetchCaptcha(); }, [fetchCaptcha]);

  const handleChange = (value: string) => {
    const upper = value.toUpperCase().replace(/[^A-Z2-9]/g, "");
    setInput(upper);
    setError(false);

    if (upper.length === code.length) {
      if (upper === code) {
        setVerified(true);
        onVerified(upper, token);
      } else {
        setError(true);
        setTimeout(() => fetchCaptcha(), 700);
      }
    }
  };

  return (
    <div className="space-y-2">
      <Label>Security Code</Label>
      <div className="flex items-center gap-2">
        <div className={`flex-1 flex items-center justify-center rounded-lg border px-4 py-2.5 font-mono text-xl font-bold tracking-[0.5em] select-none transition-colors ${
          verified
            ? "bg-green-50 border-green-300 text-green-700 dark:bg-green-950/30 dark:border-green-800 dark:text-green-400"
            : "bg-muted/60"
        }`}>
          {fetching ? "·····" : verified ? "✓ VERIFIED" : code}
        </div>
        {!verified && (
          <button
            type="button"
            onClick={fetchCaptcha}
            disabled={fetching || disabled}
            className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
            aria-label="Get a new code"
          >
            <RefreshCw className={`h-4 w-4 ${fetching ? "animate-spin" : ""}`} />
          </button>
        )}
      </div>

      {!verified && (
        <Input
          type="text"
          placeholder="Type the code above"
          value={input}
          onChange={(e) => handleChange(e.target.value)}
          maxLength={code.length || 5}
          autoComplete="off"
          spellCheck={false}
          disabled={fetching || disabled}
          className={error ? "border-destructive focus-visible:ring-destructive/30" : ""}
        />
      )}

      {error && (
        <p className="text-xs text-destructive">Wrong code — a new one has been generated.</p>
      )}
      {verified && (
        <p className="text-xs text-green-600 dark:text-green-400">Code verified ✓</p>
      )}
    </div>
  );
}
