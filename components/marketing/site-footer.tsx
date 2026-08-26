import Link from "next/link";

import { Logo } from "@/components/brand/logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-black/10 bg-neutral-950 py-12 text-white">
      <div className="page-shell grid gap-8 sm:grid-cols-2 sm:items-end">
        <div>
          <Logo className="text-2xl" />
          <p className="mt-3 max-w-sm text-sm text-neutral-400">
            Premium custom visuals built around the pickleball player.
          </p>
        </div>
        <nav
          aria-label="Footer navigation"
          className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-neutral-300 sm:justify-end"
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
