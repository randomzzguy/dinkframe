import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <main className="page-shell grid min-h-screen place-items-center py-20 text-center">
      <div>
        <p className="eyebrow">404 / Out of frame</p>
        <h1 className="mt-3 text-6xl font-black tracking-[-0.06em]">
          This page missed the court.
        </h1>
        <p className="mx-auto mt-5 max-w-lg text-neutral-600">
          The page or order may have moved, or you may not have access to it.
        </p>
        <Link
          href="/"
          className={cn(
            buttonVariants({ size: "lg" }),
            "mt-8 rounded-full px-5",
          )}
        >
          Return home
        </Link>
      </div>
    </main>
  );
}
