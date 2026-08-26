import type { Metadata } from "next";

import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <div className="reveal-up w-full max-w-md rounded-3xl border border-white/10 bg-white p-7 text-black shadow-[0_30px_100px_rgba(0,0,0,.45)] sm:p-10">
      <p className="eyebrow">Secure order access</p>
      <h1 className="font-heading mt-4 text-4xl font-bold tracking-tight">
        Sign in to DINKFRAME
      </h1>
      <p className="mt-3 text-sm leading-6 text-neutral-600">
        Enter your email and we’ll send a one-time sign-in link.
      </p>
      <LoginForm />
    </div>
  );
}
