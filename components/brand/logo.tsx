import Link from "next/link";

import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="DINKFRAME home"
      className={cn(
        "inline-flex items-center gap-2 font-black tracking-[-0.06em]",
        className,
      )}
    >
      <span aria-hidden="true" className="bg-primary size-3 -skew-x-12" />
      DINKFRAME
    </Link>
  );
}
