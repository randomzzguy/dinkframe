import Link from "next/link";

import { Logo } from "@/components/brand/logo";

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden border-t border-black/8 bg-[#eef1e4] py-14 text-neutral-950 sm:py-20">
      <div className="bg-primary/30 absolute -right-24 -bottom-48 size-96 rounded-full blur-3xl" />
      <div className="page-shell relative grid gap-10 sm:grid-cols-2 sm:items-end">
        <div>
          <Logo className="text-2xl" />
          <p className="mt-5 max-w-sm text-sm leading-6 text-neutral-600">
            Premium custom visuals built around the pickleball player.
          </p>
        </div>
        <nav
          aria-label="Footer navigation"
          className="flex flex-wrap gap-x-7 gap-y-3 text-sm text-neutral-600 sm:justify-end [&_a]:transition [&_a]:duration-300 hover:[&_a]:text-black"
        >
          <Link href="/contact">Contact</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="https://instagram.com/dinkframe">Instagram</Link>
        </nav>
      </div>
    </footer>
  );
}
