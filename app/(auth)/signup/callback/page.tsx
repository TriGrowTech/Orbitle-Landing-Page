// app/(auth)/signup/callback/page.tsx
"use client";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import GoogleRoleModal from "@/components/GoogleRoleModal";

export default function CallbackPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: "center", padding: "20px" }}>Loading...</div>}>
      <CallbackContent />
    </Suspense>
  );
}

function CallbackContent() {
  const token = useSearchParams().get("session") ?? "";
  return <GoogleRoleModal sessionToken={token} onClose={() => window.location.href = "/"} />;
}