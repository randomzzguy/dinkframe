"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="page-shell grid min-h-[70vh] place-items-center py-20 text-center">
      <div>
        <p className="eyebrow">Something went wrong</p>
        <h1 className="mt-3 text-5xl font-black tracking-tight">
          We couldn&apos;t load that frame.
        </h1>
        <p className="mx-auto mt-5 max-w-lg text-neutral-600">
          Please try again. If the problem continues, contact DINKFRAME and
          we&apos;ll help.
        </p>
        <Button type="button" size="lg" className="mt-8" onClick={reset}>
          Try again
        </Button>
      </div>
    </main>
  );
}
