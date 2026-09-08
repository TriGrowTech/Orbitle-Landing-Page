"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import api from "@/lib/axios";
import {
  AuthCard,
  AuthHeading,
  PrimaryButton,
  AuthLink,
  ErrorBanner,
} from "@/components/auth-ui";

const OTP_LENGTH = 6;

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: "center", padding: "20px" }}>Loading...</div>}>
      <VerifyOtpContent />
    </Suspense>
  );
}

function VerifyOtpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const dashboardUrl = process.env.NEXT_PUBLIC_DASHBOARD_URL ?? "";

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [globalError, setGlobalError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-focus first box
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  function startCooldown() {
    setCooldown(30);
    timerRef.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }

  useEffect(() => () => clearInterval(timerRef.current!), []);

  function handleChange(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);
    setGlobalError("");
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && index > 0) inputRefs.current[index - 1]?.focus();
    if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const paste = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    const newDigits = [...digits];
    paste.split("").forEach((ch, i) => { newDigits[i] = ch; });
    setDigits(newDigits);
    const nextEmpty = newDigits.findIndex((d) => !d);
    const focusIdx = nextEmpty === -1 ? OTP_LENGTH - 1 : nextEmpty;
    inputRefs.current[focusIdx]?.focus();
  }

  async function handleVerify() {
    const code = digits.join("");
    if (code.length < OTP_LENGTH) {
      return setGlobalError("Please enter the complete 6-digit code");
    }
    setGlobalError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/verify-signup-otp", { email, otp: code });
      if (res.data.success) {
        window.location.href = `${dashboardUrl}/dashboard`;
      } else {
        setGlobalError(res.data.message ?? "Invalid or expired OTP.");
      }
    } catch (err: any) {
      setGlobalError(err.response?.data?.message ?? "Invalid or expired OTP.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (cooldown > 0) return;
    setResendLoading(true);
    setGlobalError("");
    try {
      const res = await api.post("/auth/send-signup-otp", { email });
      if (res.data.success) {
        setDigits(Array(OTP_LENGTH).fill(""));
        inputRefs.current[0]?.focus();
        startCooldown();
      } else {
        setGlobalError(res.data.message ?? "Failed to resend OTP.");
      }
    } catch (err: any) {
      setGlobalError(err.response?.data?.message ?? "Failed to resend OTP.");
    } finally {
      setResendLoading(false);
    }
  }

  const otp = digits.join("");
  const isComplete = otp.length === OTP_LENGTH;

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
          <rect x="2" y="3" width="20" height="14" rx="2" stroke="#2563eb" strokeWidth="1.8" />
          <path
            d="M8 21h8M12 17v4"
            stroke="#2563eb"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path d="M6 8h2M11 8h2M16 8h2" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>

      <AuthHeading
        title="Enter OTP"
        subtitle={
          email
            ? `We sent a 6-digit code to ${email}`
            : "Enter the 6-digit code we sent to your email"
        }
      />

      {globalError && <ErrorBanner message={globalError} />}

      {/* OTP boxes */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          justifyContent: "center",
          marginBottom: "28px",
        }}
        onPaste={handlePaste}
      >
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            style={{
              width: "48px",
              height: "56px",
              textAlign: "center",
              fontSize: "22px",
              fontWeight: "700",
              color: "#0d1b2e",
              background: digit ? "#eff6ff" : "#f8fafc",
              border: `2px solid ${digit ? "#2563eb" : "#e2e8f0"}`,
              borderRadius: "12px",
              outline: "none",
              transition: "border-color 0.15s, background 0.15s, box-shadow 0.15s",
              fontFamily: "'DM Mono', 'Courier New', monospace",
              cursor: "text",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "#2563eb";
              e.currentTarget.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.15)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = digit ? "#2563eb" : "#e2e8f0";
              e.currentTarget.style.boxShadow = "none";
            }}
          />
        ))}
      </div>

      <PrimaryButton loading={loading} disabled={!isComplete} onClick={handleVerify}>
        Verify OTP
      </PrimaryButton>

      {/* Resend */}
      <div style={{ textAlign: "center", marginTop: "20px" }}>
        {cooldown > 0 ? (
          <p style={{ fontSize: "13px", color: "#94a3b8", margin: 0 }}>
            Resend code in{" "}
            <span style={{ color: "#2563eb", fontWeight: "600", fontVariantNumeric: "tabular-nums" }}>
              0:{String(cooldown).padStart(2, "0")}
            </span>
          </p>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            disabled={resendLoading}
            style={{
              background: "none",
              border: "none",
              fontSize: "13px",
              color: resendLoading ? "#93c5fd" : "#2563eb",
              cursor: resendLoading ? "not-allowed" : "pointer",
              fontWeight: "600",
              fontFamily: "inherit",
              padding: 0,
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            {resendLoading ? (
              <>
                <svg width="13" height="13" viewBox="0 0 13 13" style={{ animation: "spin 0.7s linear infinite" }}>
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                  <circle cx="6.5" cy="6.5" r="5" fill="none" stroke="#93c5fd" strokeWidth="2" />
                  <path d="M11.5 6.5a5 5 0 0 0-5-5" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" />
                </svg>
                Sending...
              </>
            ) : (
              "Didn't receive a code? Resend"
            )}
          </button>
        )}
      </div>

      <div style={{ textAlign: "center", marginTop: "16px" }}>
        <AuthLink href="/login">← Back to Login</AuthLink>
      </div>
    </AuthCard>
  );
}