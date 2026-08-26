import type { Metadata } from "next";

import { PackageGrid } from "@/components/marketing/package-grid";

export const metadata: Metadata = { title: "Packages" };

export default function PackagesPage() {
  return (
    <section className="page-shell py-20 sm:py-28">
      <p className="eyebrow">Straightforward pricing</p>
      <h1 className="mt-4 max-w-4xl text-6xl font-black tracking-[-0.06em] sm:text-8xl">
        ONE GAME. FOUR WAYS TO FRAME IT.
      </h1>
      <p className="mt-6 max-w-xl text-lg leading-8 text-neutral-600">
        Every package includes premium design and a clear amendment allowance.
        Extra amendments are RM10 each.
      </p>
      <div className="mt-14">
        <PackageGrid />
      </div>
    </section>
  );
}
