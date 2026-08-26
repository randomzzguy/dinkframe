import { ArrowRight, Camera, Clock3, Layers3, Trophy } from "lucide-react";
import Link from "next/link";

import { PackageGrid } from "@/components/marketing/package-grid";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const benefits = [
  [
    Trophy,
    "Built around the player",
    "Your story, event, partners, and sponsors lead the composition.",
  ],
  [
    Layers3,
    "Tournament-specific",
    "Every frame is tailored to the exact tournament and event lineup.",
  ],
  [
    Camera,
    "Social-ready",
    "Premium visuals designed to land beautifully on your feed.",
  ],
  [
    Clock3,
    "Simple from the start",
    "Upload, choose a direction, confirm payment, and we take it from there.",
  ],
] as const;

export default function HomePage() {
  return (
    <>
      <section className="page-shell grid min-h-[76vh] items-center gap-12 py-20 lg:grid-cols-[1.15fr_.85fr]">
        <div>
          <p className="eyebrow">Premium pickleball visuals</p>
          <h1 className="mt-5 max-w-4xl text-6xl leading-[0.88] font-black tracking-[-0.07em] sm:text-8xl lg:text-9xl">
            YOUR GAME.
            <br />
            <span className="text-[color:var(--primary)] [text-shadow:2px_2px_0_#111]">
              OUR FRAME.
            </span>
          </h1>
          <p className="mt-8 max-w-xl text-lg leading-8 text-neutral-600">
            Premium custom posters for pickleball athletes—built for your
            tournament, your story, and your next big post.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              href="/login"
              className={cn(
                buttonVariants({ size: "lg" }),
                "h-12 rounded-full px-6 font-bold",
              )}
            >
              Order your poster <ArrowRight />
            </Link>
            <Link
              href="/work"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "h-12 rounded-full px-6",
              )}
            >
              View our work
            </Link>
          </div>
        </div>
        <div
          aria-label="Poster artwork placeholder"
          className="relative mx-auto aspect-[4/5] w-full max-w-md overflow-hidden rounded-3xl border border-black/10 bg-neutral-950 p-7 text-white shadow-2xl shadow-lime-200/50"
        >
          <div className="absolute inset-0 bg-[linear-gradient(145deg,transparent_15%,rgba(216,255,54,.85)_15%,rgba(216,255,54,.85)_20%,transparent_20%,transparent_68%,rgba(110,69,255,.8)_68%,rgba(110,69,255,.8)_76%,transparent_76%)]" />
          <div className="relative flex h-full flex-col justify-between">
            <p className="text-xs tracking-[0.3em] uppercase">
              DINKFRAME / 001
            </p>
            <div>
              <p className="text-primary text-sm font-bold tracking-widest uppercase">
                Tournament poster
              </p>
              <p className="mt-2 text-6xl leading-[.8] font-black tracking-[-0.08em]">
                OWN
                <br />
                THE
                <br />
                COURT.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-black/8 bg-white py-24">
        <div className="page-shell">
          <p className="eyebrow">Why DINKFRAME</p>
          <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-black/10 bg-black/10 md:grid-cols-2 lg:grid-cols-4">
            {benefits.map(([Icon, title, copy]) => (
              <article key={title} className="bg-white p-7">
                <Icon className="size-6" />
                <h2 className="mt-12 text-lg font-bold">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-neutral-600">
                  {copy}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="page-shell py-24">
        <div className="mb-10 flex items-end justify-between gap-6">
          <div>
            <p className="eyebrow">Packages</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight">
              Pick your frame count.
            </h2>
          </div>
          <Link
            href="/packages"
            className="hidden text-sm font-semibold underline underline-offset-4 sm:block"
          >
            Compare packages
          </Link>
        </div>
        <PackageGrid />
      </section>

      <section className="bg-primary py-20 text-black">
        <div className="page-shell flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-end">
          <h2 className="max-w-4xl text-5xl leading-[.92] font-black tracking-[-0.06em] sm:text-7xl">
            READY TO FRAME YOUR NEXT TOURNAMENT?
          </h2>
          <Link
            href="/login"
            className={cn(
              buttonVariants({ size: "lg" }),
              "h-12 shrink-0 rounded-full bg-black px-6 text-white hover:bg-black/80",
            )}
          >
            Start your order <ArrowRight />
          </Link>
        </div>
      </section>
    </>
  );
}
