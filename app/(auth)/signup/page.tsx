"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import api from "@/lib/axios";
import {
  Input,
  PasswordInput,
  PrimaryButton,
  OutlineButton,
  Divider,
  AuthLink,
  BottomNav,
  ErrorBanner,
} from "@/components/auth-ui";


const H = "'Poppins', sans-serif";
const B = "'Montserrat', sans-serif";

type Role = "agent" | "operator" | "";
type EmailVerifyState =
  | "idle"
  | "sending"
  | "otp-sent"
  | "verifying"
  | "verified";

const validateEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const validatePhone = (p: string) => /^\+?[\d\s\-()]{7,15}$/.test(p);

// ─── Field wrapper ────────────────────────────────────────────────────────────
function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
      <label
        style={{
          fontSize: "10px",
          fontWeight: 700,
          color: "#64748b",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          fontFamily: B,
        }}
      >
        {label}
      </label>
      {children}
      {error && (
        <span
          style={{
            fontSize: "10px",
            color: "#ef4444",
            fontFamily: B,
            display: "flex",
            alignItems: "center",
            gap: "3px",
          }}
        >
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
            <circle cx="4.5" cy="4.5" r="4" stroke="#ef4444" strokeWidth="1" />
            <path
              d="M4.5 2.5v2.5"
              stroke="#ef4444"
              strokeWidth="1"
              strokeLinecap="round"
            />
            <circle cx="4.5" cy="6.5" r="0.5" fill="#ef4444" />
          </svg>
          {error}
        </span>
      )}
    </div>
  );
}

// ─── Role Select ──────────────────────────────────────────────────────────────
function RoleSelect({
  value,
  onChange,
  error,
}: {
  value: Role;
  onChange: (r: Role) => void;
  error?: string;
}) {
  return (
    <Field label="I am a" error={error}>
      <div style={{ position: "relative" }}>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as Role)}
          style={{
            width: "100%",
            padding: "7px 28px 7px 10px",
            fontSize: "12px",
            color: value ? "#0d1b2e" : "#94a3b8",
            background: "#f8fafc",
            border: `1.5px solid ${error ? "#ef4444" : "#e2e8f0"}`,
            borderRadius: "7px",
            outline: "none",
            fontFamily: B,
            appearance: "none",
            cursor: "pointer",
            transition: "border-color 0.15s",
            boxSizing: "border-box",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "#2563eb")}
          onBlur={(e) =>
            (e.currentTarget.style.borderColor = error ? "#ef4444" : "#e2e8f0")
          }
        >
          <option value="" disabled>
            Select your role
          </option>
          <option value="agent">Travel Agent</option>
          <option value="operator">Tour Operator</option>
        </select>
        <div
          style={{
            position: "absolute",
            right: "9px",
            top: "50%",
            transform: "translateY(-50%)",
            pointerEvents: "none",
          }}
        >
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <path
              d="M2.5 4.5L6 8l3.5-3.5"
              stroke="#94a3b8"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </Field>
  );
}

// ─── Email field with inline Verify + OTP ────────────────────────────────────
function EmailVerifyField({
  email,
  onChange,
  hasError,
  fieldError,
  onVerified,
}: {
  email: string;
  onChange: (v: string) => void;
  hasError: boolean;
  fieldError?: string;
  onVerified: () => void;
}) {
  const [state, setState] = useState<EmailVerifyState>("idle");
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const otpRef = useRef<HTMLInputElement>(null);

  function startTimer(seconds = 60) {
    setCooldown(seconds);
    clearInterval(timerRef.current!);
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

  function handleEmailChange(v: string) {
    onChange(v);
    if (state !== "idle" && state !== "verified") {
      setState("idle");
      setOtp("");
      setOtpError("");
      setCooldown(0);
      clearInterval(timerRef.current!);
    }
  }

  async function handleSendOtp() {
    if (!email || !validateEmail(email)) return;
    setState("sending");
    try {
      await api.post("/auth/send-signup-otp", { email });
      setState("otp-sent");
      setOtp("");
      setOtpError("");
      startTimer(60);
      setTimeout(() => otpRef.current?.focus(), 300);
    } catch (err: any) {
      setState("idle");
      setOtpError(err?.response?.data?.message ?? "Failed to send OTP.");
    }
  }

  async function handleVerifyOtp() {
    if (otp.length < 6) return setOtpError("Enter the 6-digit code");
    setOtpError("");
    setState("verifying");
    try {
      await api.post("/auth/verify-signup-otp", { email, otp });
      setState("verified");
      clearInterval(timerRef.current!);
      setCooldown(0);
      onVerified();
    } catch (err: any) {
      setState("otp-sent");
      setOtpError(err?.response?.data?.message ?? "Invalid or expired OTP.");
    }
  }

  const isVerified = state === "verified";
  const otpSent = state === "otp-sent" || state === "verifying";
  const sending = state === "sending";
  const canSend =
    email.length > 0 &&
    validateEmail(email) &&
    !sending &&
    !otpSent &&
    !isVerified;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
      <label
        style={{
          fontSize: "10px",
          fontWeight: 700,
          color: "#64748b",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          fontFamily: B,
        }}
      >
        Email address
      </label>

      {/* ── On desktop: side-by-side. On mobile: stacked. ── */}
      <div className="email-verify-row">
        {/* Email input */}
        <div className={`email-input-wrap${otpSent ? " otp-active" : ""}`}>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => handleEmailChange(e.target.value)}
            disabled={isVerified || otpSent}
            autoComplete="email"
            style={{
              width: "100%",
              padding: "7px 72px 7px 10px",
              fontSize: "12px",
              color: "#0d1b2e",
              background: isVerified ? "#f0fdf4" : "#f8fafc",
              border: `1.5px solid ${hasError && fieldError ? "#ef4444" : isVerified ? "#22c55e" : "#e2e8f0"}`,
              borderRadius: "7px",
              outline: "none",
              fontFamily: B,
              boxSizing: "border-box",
              transition: "all 0.15s",
              opacity: otpSent ? 0.65 : 1,
            }}
            onFocus={(e) => {
              if (!isVerified && !otpSent)
                e.currentTarget.style.borderColor = "#2563eb";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = isVerified
                ? "#22c55e"
                : hasError && fieldError
                  ? "#ef4444"
                  : "#e2e8f0";
            }}
          />
          {isVerified ? (
            <div
              style={{
                position: "absolute",
                right: "7px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "#dcfce7",
                borderRadius: "5px",
                padding: "2px 7px",
                display: "flex",
                alignItems: "center",
                gap: "3px",
              }}
            >
              <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                <path
                  d="M1.5 4.5l2 2 4-4"
                  stroke="#16a34a"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  color: "#16a34a",
                  fontFamily: B,
                }}
              >
                Verified
              </span>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleSendOtp}
              disabled={!canSend}
              style={{
                position: "absolute",
                right: "6px",
                top: "50%",
                transform: "translateY(-50%)",
                padding: "3px 9px",
                borderRadius: "5px",
                fontSize: "10px",
                fontWeight: 700,
                background: canSend
                  ? "linear-gradient(135deg, #2563eb, #1d4ed8)"
                  : "#e2e8f0",
                color: canSend ? "#fff" : "#94a3b8",
                border: "none",
                cursor: canSend ? "pointer" : "not-allowed",
                fontFamily: B,
                transition: "all 0.15s",
                whiteSpace: "nowrap",
              }}
            >
              {sending ? "Sending…" : otpSent ? "Sent ✓" : "Verify"}
            </button>
          )}
        </div>

        {/* OTP panel */}
        <div className={`otp-panel${otpSent ? " visible" : ""}`}>
          <input
            ref={otpRef}
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="6-digit OTP"
            value={otp}
            onChange={(e) => {
              setOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
              setOtpError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && handleVerifyOtp()}
            style={{
              flex: 1,
              padding: "7px 10px",
              fontSize: "12px",
              color: "#0d1b2e",
              background: "#f8fafc",
              border: `1.5px solid ${otpError ? "#ef4444" : "#e2e8f0"}`,
              borderRadius: "7px",
              outline: "none",
              fontFamily: B,
              letterSpacing: "0.12em",
              boxSizing: "border-box",
              transition: "border-color 0.15s",
              minWidth: 0,
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#2563eb")}
            onBlur={(e) =>
              (e.currentTarget.style.borderColor = otpError
                ? "#ef4444"
                : "#e2e8f0")
            }
          />
          <button
            type="button"
            onClick={handleVerifyOtp}
            disabled={state === "verifying" || otp.length < 6}
            style={{
              padding: "6px 10px",
              borderRadius: "7px",
              fontSize: "11px",
              fontWeight: 700,
              background:
                state === "verifying" || otp.length < 6
                  ? "#e2e8f0"
                  : "linear-gradient(135deg, #2563eb, #1d4ed8)",
              color:
                state === "verifying" || otp.length < 6 ? "#94a3b8" : "#fff",
              border: "none",
              cursor:
                state === "verifying" || otp.length < 6
                  ? "not-allowed"
                  : "pointer",
              fontFamily: B,
              whiteSpace: "nowrap",
              transition: "all 0.15s",
              flexShrink: 0,
            }}
          >
            {state === "verifying" ? "…" : "Submit"}
          </button>
          <div style={{ minWidth: 40, textAlign: "right", flexShrink: 0 }}>
            {cooldown > 0 ? (
              <span
                style={{
                  fontSize: "10px",
                  color: "#94a3b8",
                  fontFamily: B,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                0:{String(cooldown).padStart(2, "0")}
              </span>
            ) : (
              <button
                type="button"
                onClick={handleSendOtp}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  fontSize: "10px",
                  fontWeight: 700,
                  color: "#2563eb",
                  cursor: "pointer",
                  fontFamily: B,
                }}
              >
                Resend
              </button>
            )}
          </div>
        </div>
      </div>

      {hasError && fieldError && !otpError && (
        <span style={{ fontSize: "10px", color: "#ef4444", fontFamily: B }}>
          {fieldError}
        </span>
      )}
      {otpError && (
        <span
          style={{
            fontSize: "10px",
            color: "#ef4444",
            fontFamily: B,
            display: "flex",
            alignItems: "center",
            gap: "3px",
          }}
        >
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
            <circle cx="4.5" cy="4.5" r="4" stroke="#ef4444" strokeWidth="1" />
            <path
              d="M4.5 2.5v2.5"
              stroke="#ef4444"
              strokeWidth="1"
              strokeLinecap="round"
            />
            <circle cx="4.5" cy="6.5" r="0.5" fill="#ef4444" />
          </svg>
          {otpError}
        </span>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SignupPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: "center", padding: "20px" }}>Loading...</div>}>
      <SignupContent />
    </Suspense>
  );
}

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dashboardUrl = process.env.NEXT_PUBLIC_DASHBOARD_URL ?? "";

  const fromParam = searchParams.get("from");
  const defaultRole: Role =
    fromParam === "operators"
      ? "operator"
      : fromParam === "agents"
        ? "agent"
        : "";

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    companyName: "",
    password: "",
    confirmPassword: "",
  });
  const [role, setRole] = useState<Role>(defaultRole);
  const [emailVerified, setEmailVerified] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!fromParam) {
      const ref = document.referrer;
      if (ref.includes("/operators")) setRole("operator");
      else if (ref.includes("/agents")) setRole("agent");
    }
  }, [fromParam]);

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: "" }));
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    try {
      // Google OAuth — redirect to backend Google auth endpoint
      window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/auth/google`;
    } catch {
      setGlobalError("Google login failed.");
      setGoogleLoading(false);
    }
  }

  async function handleSignup() {
    setErrors({});
    setGlobalError("");
    const e: Record<string, string> = {};
    if (!form.fullName.trim()) e.fullName = "Required";
    if (!form.email) e.email = "Required";
    else if (!validateEmail(form.email)) e.email = "Invalid email";
    else if (!emailVerified) e.email = "Please verify your email first";
    if (!form.phone) e.phone = "Required";
    else if (!validatePhone(form.phone)) e.phone = "Invalid number";
    if (!form.companyName.trim()) e.companyName = "Required";
    if (!role) e.role = "Please select a role";
    if (!form.password) e.password = "Required";
    else if (form.password.length < 8) e.password = "Min. 8 characters";
    if (!form.confirmPassword) e.confirmPassword = "Required";
    else if (form.password !== form.confirmPassword)
      e.confirmPassword = "Passwords don't match";
    if (!agreed) e.terms = "Please accept to continue";
    if (Object.keys(e).length) return setErrors(e);

    setLoading(true);
    try {
      const res = await api.post("/auth/register", {
        name: form.fullName,
        email: form.email,
        password: form.password,
        businessName: form.companyName,
        phone: form.phone,
        role,
      });
      if (res.data.success) {
        window.location.href = `${dashboardUrl}/onboarding`;
      }
    } catch (err: any) {
      setGlobalError(
        err?.response?.data?.message ||
          "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  const inp = { padding: "7px 10px", fontSize: "12px" };

  return (
    <>
      <style>{`
        .signup-card { opacity: 0; transform: translateY(10px); transition: opacity 0.35s ease, transform 0.35s ease; }
        .signup-card.mounted { opacity: 1; transform: translateY(0); }

        .sg { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px; }
        .sg-full { grid-column: 1 / -1; }

        /* ── Email verify row ── */
        .email-verify-row {
          display: flex;
          flex-direction: row;
          gap: 6px;
          align-items: flex-start;
        }

        /* Email input wrapper — always relative so the absolute button works */
        .email-input-wrap {
          position: relative;
          flex: 1;
          min-width: 0;
          transition: flex 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }
        .email-input-wrap.otp-active {
          flex: 0 0 50%;
        }

        /* OTP panel — hidden by default, slides in on desktop, drops down on mobile */
        .otp-panel {
          display: flex;
          gap: 5px;
          align-items: center;
          min-width: 0;
          /* desktop: slide from the right */
          flex: 0 0 0%;
          overflow: hidden;
          opacity: 0;
          transform: translateX(12px);
          transition:
            flex 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94),
            opacity 0.5s ease 0.15s,
            transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.15s;
        }
        .otp-panel.visible {
          flex: 0 0 50%;
          opacity: 1;
          transform: translateX(0);
        }

        /* ── Mobile overrides ── */
        @media (max-width: 768px) {
          .sg { grid-template-columns: 1fr; }
          .sg-full { grid-column: 1; }

          /* Stack email + OTP vertically */
          .email-verify-row {
            flex-direction: column;
          }

          /* Email input always full width on mobile */
          .email-input-wrap,
          .email-input-wrap.otp-active {
            flex: 1 1 100% !important;
            width: 100%;
          }

          /* OTP panel: collapse height (not width) when hidden, expand when visible */
          .otp-panel {
            flex: 1 1 100% !important;
            width: 100%;
            max-height: 0;
            overflow: hidden;
            opacity: 0;
            transform: translateY(-6px);
            transition:
              max-height 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94),
              opacity 0.35s ease 0.1s,
              transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.1s;
          }
          .otp-panel.visible {
            flex: 1 1 100% !important;
            max-height: 60px;
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      <div
        className={`signup-card${mounted ? " mounted" : ""}`}
        style={{
          width: "100%",
          maxWidth: "480px",
          background: "#ffffff",
          borderRadius: "16px",
          boxShadow:
            "0 4px 6px rgba(13,27,46,0.04), 0 12px 40px rgba(13,27,46,0.10)",
          border: "1px solid rgba(37,99,235,0.07)",
          fontFamily: B,
        }}
      >
        <div style={{ padding: "16px 20px 14px" }}>
          <div style={{ marginBottom: "10px" }}>
            <h1
              style={{
                fontSize: "18px",
                fontWeight: 800,
                color: "#0d1b2e",
                margin: "0 0 2px",
                fontFamily: H,
                letterSpacing: "-0.4px",
                lineHeight: 1.2,
              }}
            >
              Create your account
            </h1>
            <p
              style={{
                fontSize: "11px",
                color: "#94a3b8",
                margin: 0,
                fontFamily: B,
              }}
            >
              Join Orbitle — your travel business, structured.
            </p>
          </div>

          {globalError && <ErrorBanner message={globalError} />}

          <OutlineButton loading={googleLoading} onClick={handleGoogle}>
            Continue with Google
          </OutlineButton>

          <Divider text="or fill in your details" />

          {/* Row 1 — Full Name + Phone */}
          <div className="sg">
            <Field label="Full name" error={errors.fullName}>
              <Input
                type="text"
                placeholder="Jane Smith"
                value={form.fullName}
                onChange={(e) => set("fullName", e.target.value)}
                hasError={!!errors.fullName}
                autoComplete="name"
                style={inp}
              />
            </Field>
            <Field label="Phone number" error={errors.phone}>
              <Input
                type="tel"
                placeholder="+91 98765 43210"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                hasError={!!errors.phone}
                autoComplete="tel"
                style={inp}
              />
            </Field>
          </div>

          {/* Row 2 — I am a (Role) + Company */}
          <div className="sg">
            <RoleSelect
              value={role}
              onChange={(r) => {
                setRole(r);
                setErrors((e) => ({ ...e, role: "" }));
              }}
              error={errors.role}
            />
            <Field label="Company name" error={errors.companyName}>
              <Input
                type="text"
                placeholder="Acme Travels"
                value={form.companyName}
                onChange={(e) => set("companyName", e.target.value)}
                hasError={!!errors.companyName}
                autoComplete="organization"
                style={inp}
              />
            </Field>
          </div>

          {/* Row 3 — Email (full width) */}
          <div className="sg" style={{ marginBottom: "8px" }}>
            <div className="sg-full">
              <EmailVerifyField
                email={form.email}
                onChange={(v) => {
                  set("email", v);
                  setEmailVerified(false);
                }}
                hasError={!!errors.email}
                fieldError={errors.email}
                onVerified={() => setEmailVerified(true)}
              />
            </div>
          </div>

          {/* Row 4 — Password + Confirm */}
          <div className="sg">
            <Field label="Password" error={errors.password}>
              <PasswordInput
                placeholder="Min. 8 characters"
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                hasError={!!errors.password}
                autoComplete="new-password"
                style={inp}
              />
            </Field>
            <Field label="Confirm Password" error={errors.confirmPassword}>
              <PasswordInput
                placeholder="Repeat password"
                value={form.confirmPassword}
                onChange={(e) => set("confirmPassword", e.target.value)}
                hasError={!!errors.confirmPassword}
                autoComplete="new-password"
                style={inp}
              />
            </Field>
          </div>

          {/* Terms */}
          <div style={{ marginBottom: "10px" }}>
            <label
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "8px",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  position: "relative",
                  flexShrink: 0,
                  marginTop: "1px",
                }}
              >
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => {
                    setAgreed(e.target.checked);
                    setErrors((err) => ({ ...err, terms: "" }));
                  }}
                  style={{
                    opacity: 0,
                    position: "absolute",
                    inset: 0,
                    cursor: "pointer",
                    margin: 0,
                    width: "100%",
                    height: "100%",
                  }}
                />
                <div
                  style={{
                    width: 14,
                    height: 14,
                    border: `2px solid ${errors.terms ? "#ef4444" : agreed ? "#2563eb" : "#cbd5e1"}`,
                    borderRadius: "4px",
                    background: agreed
                      ? "linear-gradient(135deg, #2563eb, #1d4ed8)"
                      : "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.15s",
                    boxShadow: agreed
                      ? "0 1px 6px rgba(37,99,235,0.3)"
                      : "none",
                  }}
                >
                  {agreed && (
                    <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                      <path
                        d="M1 3l2 2 4-4"
                        stroke="white"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
              </div>
              <span
                style={{
                  fontSize: "10.5px",
                  color: "#64748b",
                  fontFamily: B,
                  lineHeight: 1.5,
                }}
              >
                I agree to Orbitle's{" "}
                <AuthLink href="/terms-of-service">Terms of Service</AuthLink>{" "}
                and <AuthLink href="/privacy-policy">Privacy Policy</AuthLink>
              </span>
            </label>
            {errors.terms && (
              <p
                style={{
                  fontSize: "10px",
                  color: "#ef4444",
                  margin: "3px 0 0 22px",
                  fontFamily: B,
                }}
              >
                {errors.terms}
              </p>
            )}
          </div>

          <PrimaryButton loading={loading} onClick={handleSignup}>
            Create account →
          </PrimaryButton>

          <BottomNav
            text="Already have an account?"
            linkText="Log in"
            href="/login"
          />
        </div>
      </div>
    </>
  );
}