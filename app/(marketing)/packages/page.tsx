import type { Metadata } from "next";

import { PackageGrid } from "@/components/marketing/package-grid";

export const metadata: Metadata = { title: "Packages" };

export default function PackagesPage() {
  return (
    <section className="page-shell py-20 sm:py-32">
      <p className="eyebrow">Straightforward pricing</p>
      <h1 className="reveal-up font-heading mt-5 max-w-5xl text-6xl leading-[.88] font-bold tracking-[-0.065em] sm:text-8xl">
        ONE GAME. FOUR WAYS TO FRAME IT.
      </h1>
      <p className="mt-7 max-w-xl text-lg leading-8 text-neutral-400">
        Every package includes premium design and a clear amendment allowance.
        Extra amendments are RM10 each.
      </p>
      <div className="mt-16">
        <PackageGrid />
      </div>
    </section>
  );
}
