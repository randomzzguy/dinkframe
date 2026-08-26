import { ArrowUpRight, AtSign } from "lucide-react";
import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navigation = [
  ["Work", "/work"],
  ["Packages", "/packages"],
  ["How it works", "/how-it-works"],
  ["About", "/about"],
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-black/8 bg-white/85 backdrop-blur-xl">
      <div className="page-shell flex h-18 items-center justify-between gap-6">
        <Logo className="text-xl" />
        <nav
          aria-label="Main navigation"
          className="hidden items-center gap-7 md:flex"
        >
          {navigation.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className="text-sm text-neutral-600 transition hover:text-black"
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="https://instagram.com/dinkframe"
            aria-label="DINKFRAME on Instagram"
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon" }),
              "hidden sm:inline-flex",
            )}
          >
            <AtSign />
          </Link>
          <Link
            href="/login"
            className={cn(
              buttonVariants({ size: "lg" }),
              "rounded-full px-4 font-bold",
            )}
          >
            Order your poster <ArrowUpRight />
          </Link>
        </div>
      </div>
    </header>
  );
}
