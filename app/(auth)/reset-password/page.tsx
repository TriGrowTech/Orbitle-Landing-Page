"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AuthCard,
  AuthHeading,
  Field,
  PasswordInput,
  PrimaryButton,
  AuthLink,
  ErrorBanner,
  SuccessState,
} from "@/components/auth-ui";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: "center", padding: "20px" }}>Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit() {
    setErrors({});
    setGlobalError("");
    const newErrors: Record<string, string> = {};
    if (!password) newErrors.password = "Password is required";
    else if (password.length < 8)
      newErrors.password = "Password must be at least 8 characters";
    if (!confirmPassword)
      newErrors.confirmPassword = "Please confirm your password";
    else if (password !== confirmPassword)
      newErrors.confirmPassword = "Passwords do not match";
    if (Object.keys(newErrors).length) return setErrors(newErrors);

    if (!token) return setGlobalError("Invalid or expired reset link.");

    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (res.ok) setSuccess(true);
      else setGlobalError(data.message ?? "Failed to reset password. The link may have expired.");
    } catch {
      setGlobalError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <AuthCard>
        <SuccessState
          icon={
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <polyline
                points="20 6 9 17 4 12"
                stroke="#16a34a"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          }
          title="Password updated!"
          subtitle="Your password has been reset successfully. You can now log in with your new password."
        >
          <PrimaryButton onClick={() => router.push("/login")}>
            Continue to Login
          </PrimaryButton>
        </SuccessState>
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      <div
        style={{
          width: "48px",
          height: "48px",
          background: "#eff6ff",
          borderRadius: "12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "20px",
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
            stroke="#2563eb"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <polyline
            points="9 12 11 14 15 10"
            stroke="#2563eb"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <AuthHeading
        title="Set new password"
        subtitle="Choose a strong password for your account"
      />

      {!token && (
        <ErrorBanner message="Invalid or missing reset token. Please request a new reset link." />
      )}
      {globalError && <ErrorBanner message={globalError} />}

      <Field label="New password" error={errors.password}>
        <PasswordInput
          placeholder="Min. 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hasError={!!errors.password}
          autoComplete="new-password"
        />
      </Field>

      {/* Password strength bar */}
      {password && (
        <div style={{ marginTop: "-8px", marginBottom: "16px" }}>
          <StrengthBar password={password} />
        </div>
      )}

      <Field label="Confirm new password" error={errors.confirmPassword}>
        <PasswordInput
          placeholder="Re-enter your new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          hasError={!!errors.confirmPassword}
          autoComplete="new-password"
        />
      </Field>

      <PrimaryButton loading={loading} disabled={!token} onClick={handleSubmit}>
        Reset password
      </PrimaryButton>

      <div style={{ textAlign: "center", marginTop: "20px" }}>
        <AuthLink href="/login">← Back to Login</AuthLink>
      </div>
    </AuthCard>
  );
}

function StrengthBar({ password }: { password: string }) {
  const score = (() => {
    let s = 0;
    if (password.length >= 8) s++;
    if (password.length >= 12) s++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return Math.min(s, 4);
  })();

  const labels = ["", "Weak", "Fair", "Good", "Strong"];
  const colors = ["", "#ef4444", "#f59e0b", "#3b82f6", "#22c55e"];

  return (
    <div>
      <div style={{ display: "flex", gap: "4px", marginBottom: "4px" }}>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: "3px",
              borderRadius: "2px",
              background: i <= score ? colors[score] : "#e2e8f0",
              transition: "background 0.2s",
            }}
          />
        ))}
      </div>
      {score > 0 && (
        <p style={{ fontSize: "11px", color: colors[score], margin: 0, fontWeight: "600" }}>
          {labels[score]}
        </p>
      )}
    </div>
  );
}