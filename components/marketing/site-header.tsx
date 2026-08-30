import { ArrowUpRight, AtSign, Menu } from "lucide-react";
import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button";
import { getAppDashboardUrl, getAppLoginUrl } from "@/lib/auth/urls";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const navigation = [
  ["Work", "/work"],
  ["Packages", "/packages"],
  ["How it works", "/how-it-works"],
  ["About", "/about"],
] as const;

export async function SiteHeader() {
  const loginUrl = getAppLoginUrl();
  const dashboardUrl = getAppDashboardUrl();
  const supabase = await createClient();
  const { data: claimData } = await supabase.auth.getClaims();
  const userId =
    typeof claimData?.claims?.sub === "string" ? claimData.claims.sub : null;
  const [profileResult, entitlementResult] = userId
    ? await Promise.all([
        supabase
          .from("profiles")
          .select("full_name, instagram_handle")
          .eq("id", userId)
          .maybeSingle(),
        supabase
          .from("frame_entitlements")
          .select("frames_total, frames_used, activated_at")
          .eq("client_id", userId),
      ])
    : [{ data: null }, { data: [] }];
  const profile = profileResult.data;
  const firstName = profile?.full_name?.trim().split(/\s+/)[0] ?? "Player";
  const framesRemaining = (entitlementResult.data ?? [])
    .filter((item) => item.activated_at)
    .reduce(
      (total, item) =>
        total + Math.max(0, item.frames_total - item.frames_used),
      0,
    );

  return (
    <header className="sticky top-0 z-40 border-b border-black/8 bg-[#f9faf4]/82 text-neutral-950 shadow-[0_8px_30px_rgba(30,40,10,.04)] backdrop-blur-2xl">
      <div className="page-shell flex h-20 items-center justify-between gap-5">
        <Logo className="text-lg" />
        <nav
          aria-label="Main navigation"
          className="hidden items-center gap-7 md:flex"
        >
          {navigation.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className="after:bg-primary relative py-2 text-sm text-neutral-600 transition duration-300 after:absolute after:inset-x-0 after:bottom-0 after:h-px after:origin-left after:scale-x-0 after:transition-transform hover:text-black hover:after:scale-x-100"
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {userId && (
            <div className="hidden text-right lg:block">
              <p className="text-sm font-bold">Welcome, {firstName}</p>
              <p className="text-xs text-neutral-500">
                {profile?.instagram_handle
                  ? `@${profile.instagram_handle.replace(/^@/, "")}`
                  : "Signed in"}
                {framesRemaining > 0
                  ? ` · ${framesRemaining} frame${framesRemaining === 1 ? "" : "s"} left`
                  : ""}
              </p>
            </div>
          )}
          <Link
            href="https://instagram.com/dinkframe"
            aria-label="DINKFRAME on Instagram"
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon" }),
              "hidden text-neutral-500 hover:bg-black/5 hover:text-black sm:inline-flex",
            )}
          >
            <AtSign />
          </Link>
          <Link
            href={userId ? dashboardUrl : loginUrl}
            className={cn(
              buttonVariants({ size: "lg" }),
              "hidden rounded-full px-5 font-bold sm:inline-flex",
            )}
          >
            {userId ? "Open dashboard" : "Create or manage frames"}{" "}
            <ArrowUpRight />
          </Link>
          <details className="group relative md:hidden">
            <summary className="hover:border-primary/50 hover:bg-primary/15 grid size-10 cursor-pointer list-none place-items-center rounded-xl border border-black/10 bg-white transition [&::-webkit-details-marker]:hidden">
              <Menu className="size-5" />
              <span className="sr-only">Open navigation</span>
            </summary>
            <nav className="absolute top-13 right-0 z-50 flex w-64 origin-top-right flex-col rounded-2xl border border-black/10 bg-white/95 p-2 shadow-2xl backdrop-blur-2xl">
              {navigation.map(([label, href]) => (
                <Link
                  key={href}
                  href={href}
                  className="rounded-xl px-4 py-3 text-sm text-neutral-600 transition hover:bg-neutral-100 hover:text-black"
                >
                  {label}
                </Link>
              ))}
              <Link
                href={userId ? dashboardUrl : loginUrl}
                className="bg-primary mt-2 flex items-center justify-between rounded-xl px-4 py-3 text-sm font-bold text-black"
              >
                {userId ? "Open your dashboard" : "New & returning clients"}{" "}
                <ArrowUpRight className="size-4" />
              </Link>
              {userId && (
                <p className="px-4 py-3 text-xs text-neutral-500">
                  Welcome, {firstName}
                  {profile?.instagram_handle
                    ? ` · @${profile.instagram_handle.replace(/^@/, "")}`
                    : ""}
                </p>
              )}
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
