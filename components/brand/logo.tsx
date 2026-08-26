import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

export function Logo({
  className,
  showName = true,
  inverse = false,
}: {
  className?: string;
  showName?: boolean;
  inverse?: boolean;
}) {
  return (
    <Link
      href="/"
      aria-label="DINKFRAME home"
      className={cn(
        "group/logo font-heading inline-flex items-center gap-2.5 font-bold tracking-[-0.055em]",
        inverse ? "text-white" : "text-neutral-950",
        className,
      )}
    >
      <span className="group-hover/logo:border-primary/40 relative grid h-8 w-11 shrink-0 place-items-center overflow-hidden rounded-lg border border-white/10 bg-neutral-950 px-1.5 shadow-[0_0_22px_rgba(216,255,54,.1)] transition duration-300 group-hover/logo:shadow-[0_0_28px_rgba(216,255,54,.2)]">
        <Image
          src="/icon.png"
          width={598}
          height={324}
          alt=""
          className="h-auto w-full transition-transform duration-500 group-hover/logo:scale-105"
        />
      </span>
      {showName && <span>DINKFRAME</span>}
    </Link>
  );
}
