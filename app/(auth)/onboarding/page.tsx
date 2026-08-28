import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { OnboardingForm } from "@/components/auth/onboarding-form";
import { needsOnboarding } from "@/lib/auth/onboarding";
import { requireUser } from "@/lib/auth/guards";

export const metadata: Metadata = {
  title: "Complete your profile",
  robots: { index: false, follow: false },
};

export default async function OnboardingPage() {
  const { claims, supabase } = await requireUser();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("email, full_name, whatsapp, instagram_handle")
    .eq("id", claims.sub)
    .maybeSingle();

  if (error) {
    throw new Error("We couldn't load your profile.");
  }

  if (!needsOnboarding(profile?.full_name)) {
    redirect("/dashboard");
  }

  const email =
    profile?.email ??
    (typeof claims.email === "string" ? claims.email : "Your sign-in email");

  return (
    <div className="reveal-up w-full max-w-lg rounded-3xl border border-black/8 bg-white p-7 text-black shadow-[0_30px_100px_rgba(41,50,20,.16)] sm:p-10">
      <p className="eyebrow">One quick step</p>
      <h1 className="font-heading mt-4 text-5xl leading-[0.92] font-bold tracking-[-0.04em]">
        LET&apos;S GET TO KNOW YOU.
      </h1>
      <p className="mt-4 text-sm leading-6 text-neutral-600">
        Add your name so your DINKFRAME dashboard and future order briefs feel
        personal from the start.
      </p>
      <OnboardingForm
        email={email}
        whatsapp={profile?.whatsapp ?? null}
        instagramHandle={profile?.instagram_handle ?? null}
      />
    </div>
  );
}
