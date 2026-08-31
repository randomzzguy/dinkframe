import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { isAdminEmail } from "@/lib/auth/guards";
import { getAdminPostLoginPath, getSafeNextPath } from "@/lib/auth/urls";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

type LoginPageProps = {
  searchParams: Promise<{
    error?: string | string[];
    next?: string | string[];
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const query = await searchParams;
  const errorValue = query.error;
  const nextPath = getSafeNextPath(query.next);
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (data?.claims?.sub) {
    redirect(
      isAdminEmail(data.claims.email)
        ? getAdminPostLoginPath(nextPath)
        : nextPath,
    );
  }
  const hasCallbackError = Array.isArray(errorValue)
    ? errorValue.includes("callback")
    : errorValue === "callback";

  return (
    <div className="reveal-up w-full max-w-md rounded-3xl border border-white/10 bg-white p-7 text-black shadow-[0_30px_100px_rgba(0,0,0,.45)] sm:p-10">
      <p className="eyebrow">Secure order access</p>
      <h1 className="font-heading mt-4 text-4xl font-bold tracking-tight">
        Sign in to DINKFRAME
      </h1>
      <p className="mt-3 text-sm leading-6 text-neutral-600">
        Enter your email and we’ll send a one-time sign-in link.
      </p>
      {hasCallbackError ? (
        <div
          role="alert"
          className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950"
        >
          That sign-in link could not be completed. Request a fresh link below
          and open it in the same browser.
        </div>
      ) : null}
      <LoginForm nextPath={nextPath} />
    </div>
  );
}
