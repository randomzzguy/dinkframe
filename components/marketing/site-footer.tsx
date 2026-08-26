import Image from "next/image";
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden border-t border-white/8 bg-black py-14 text-white sm:py-20">
      <div className="bg-primary/8 absolute -right-24 -bottom-48 size-96 rounded-full blur-3xl" />
      <div className="page-shell relative grid gap-10 sm:grid-cols-2 sm:items-end">
        <div>
          <Image
            src="/upscaledlogo.png"
            width={1254}
            height={1254}
            alt="DINKFRAME — your game, our frame"
            className="-my-14 -ml-14 h-48 w-48 object-contain sm:-my-20 sm:-ml-20 sm:h-64 sm:w-64"
          />
          <p className="max-w-sm text-sm leading-6 text-neutral-500">
            Premium custom visuals built around the pickleball player.
          </p>
        </div>
        <nav
          aria-label="Footer navigation"
          className="flex flex-wrap gap-x-7 gap-y-3 text-sm text-neutral-400 sm:justify-end [&_a]:transition [&_a]:duration-300 hover:[&_a]:text-white"
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
