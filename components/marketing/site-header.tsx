import { ArrowUpRight, AtSign, Menu } from "lucide-react";
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
    <header className="sticky top-0 z-40 border-b border-white/8 bg-[#090a09]/80 text-white backdrop-blur-2xl">
      <div className="page-shell flex h-20 items-center justify-between gap-5">
        <Logo inverse className="text-lg" />
        <nav
          aria-label="Main navigation"
          className="hidden items-center gap-7 md:flex"
        >
          {navigation.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className="after:bg-primary relative py-2 text-sm text-neutral-400 transition duration-300 after:absolute after:inset-x-0 after:bottom-0 after:h-px after:origin-left after:scale-x-0 after:transition-transform hover:text-white hover:after:scale-x-100"
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
              "hidden text-neutral-400 hover:bg-white/8 hover:text-white sm:inline-flex",
            )}
          >
            <AtSign />
          </Link>
          <Link
            href="/login"
            className={cn(
              buttonVariants({ size: "lg" }),
              "hidden rounded-full px-5 font-bold sm:inline-flex",
            )}
          >
            Order your poster <ArrowUpRight />
          </Link>
          <details className="group relative md:hidden">
            <summary className="hover:border-primary/30 grid size-10 cursor-pointer list-none place-items-center rounded-xl border border-white/10 bg-white/5 transition hover:bg-white/10 [&::-webkit-details-marker]:hidden">
              <Menu className="size-5" />
              <span className="sr-only">Open navigation</span>
            </summary>
            <nav className="absolute top-13 right-0 z-50 flex w-64 origin-top-right flex-col rounded-2xl border border-white/12 bg-[#121410]/95 p-2 shadow-2xl backdrop-blur-2xl">
              {navigation.map(([label, href]) => (
                <Link
                  key={href}
                  href={href}
                  className="rounded-xl px-4 py-3 text-sm text-neutral-300 transition hover:bg-white/8 hover:text-white"
                >
                  {label}
                </Link>
              ))}
              <Link
                href="/login"
                className="bg-primary mt-2 flex items-center justify-between rounded-xl px-4 py-3 text-sm font-bold text-black"
              >
                Order your poster <ArrowUpRight className="size-4" />
              </Link>
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
