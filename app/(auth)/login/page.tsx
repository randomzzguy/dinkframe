import type { Metadata } from "next";

import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white p-7 text-black shadow-2xl sm:p-9">
      <p className="eyebrow">Secure order access</p>
      <h1 className="mt-3 text-4xl font-black tracking-tight">
        Sign in to DINKFRAME
      </h1>
      <p className="mt-3 text-sm leading-6 text-neutral-600">
        Enter your email and we’ll send a one-time sign-in link.
      </p>
      <LoginForm />
    </div>
  );
}
