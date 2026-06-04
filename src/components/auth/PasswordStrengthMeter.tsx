"use client";

export type PasswordStrength = "weak" | "medium" | "strong";

export function getPasswordStrength(password: string): PasswordStrength {
  if (!password) return "weak";
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[@#$!%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score++;
  if (score <= 2) return "weak";
  if (score <= 4) return "medium";
  return "strong";
}

export function hasSpecialChar(password: string): boolean {
  return /[@#$!%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
}

const config = {
  weak:   { label: "Weak",   bars: 1, color: "bg-red-500" },
  medium: { label: "Medium", bars: 2, color: "bg-yellow-500" },
  strong: { label: "Strong", bars: 3, color: "bg-green-500" },
};

export function PasswordStrengthMeter({ password }: { password: string }) {
  if (!password) return null;

  const strength = getPasswordStrength(password);
  const { label, bars, color } = config[strength];

  return (
    <div className="space-y-1.5 mt-1.5">
      <div className="flex gap-1">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${i <= bars ? color : "bg-muted"}`}
          />
        ))}
      </div>
      <div className="flex justify-between items-center">
        <p className={`text-xs font-medium ${color.replace("bg-", "text-")}`}>{label}</p>
        {!hasSpecialChar(password) && (
          <p className="text-xs text-muted-foreground">Add a special character (@#$…)</p>
        )}
      </div>
    </div>
  );
}
