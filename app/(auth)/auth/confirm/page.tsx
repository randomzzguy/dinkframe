import type { Metadata } from "next";
import Link from "next/link";

import { confirmMagicLink } from "@/app/(auth)/auth/confirm/actions";

export const metadata: Metadata = {
  title: "Complete sign in",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

type ConfirmPageProps = {
  searchParams: Promise<{
    token_hash?: string | string[];
    type?: string | string[];
    redirect_to?: string | string[];
  }>;
};

export default async function ConfirmPage({ searchParams }: ConfirmPageProps) {
  const query = await searchParams;
  const tokenHash = firstValue(query.token_hash);
  const type = firstValue(query.type);
  const redirectTo = firstValue(query.redirect_to);
  const canContinue = Boolean(tokenHash && type === "email");

  return (
    <div className="reveal-up w-full max-w-md rounded-3xl border border-white/10 bg-white p-7 text-black shadow-[0_30px_100px_rgba(0,0,0,.45)] sm:p-10">
      <p className="eyebrow">Secure sign in</p>
      <h1 className="font-heading mt-4 text-4xl font-bold tracking-tight">
        {canContinue ? "One more tap." : "This link isn’t valid."}
      </h1>
      {canContinue ? (
        <>
          <p className="mt-3 text-sm leading-6 text-neutral-600">
            Continue to securely open your DINKFRAME dashboard. This final tap
            prevents email previews from using your one-time sign-in link.
          </p>
          <form action={confirmMagicLink} className="mt-8">
            <input type="hidden" name="token_hash" value={tokenHash} />
            <input type="hidden" name="redirect_to" value={redirectTo ?? ""} />
            <button
              type="submit"
              className="bg-primary text-primary-foreground hover:bg-primary/90 h-12 w-full rounded-xl px-5 text-sm font-bold shadow-[0_8px_30px_rgba(216,255,54,.18)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_38px_rgba(216,255,54,.26)] focus-visible:ring-3 focus-visible:ring-black/20 focus-visible:outline-none active:scale-[.98]"
            >
              Continue to DINKFRAME
            </button>
          </form>
          <p className="mt-5 text-xs leading-5 text-neutral-500">
            This link can only be used once and expires automatically.
          </p>
        </>
      ) : (
        <>
          <p className="mt-3 text-sm leading-6 text-neutral-600">
            The sign-in link is incomplete, expired, or has already been used.
            Request a fresh link to continue.
          </p>
          <Link
            href="/login"
            className="bg-primary text-primary-foreground mt-8 inline-flex h-12 w-full items-center justify-center rounded-xl px-5 text-sm font-bold"
          >
            Request a new sign-in link
          </Link>
        </>
      )}
    </div>
  );
}

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
