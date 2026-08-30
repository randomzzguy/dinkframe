import {
  ArrowRight,
  Camera,
  Clock3,
  Layers3,
  Sparkles,
  Trophy,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { PackageGrid } from "@/components/marketing/package-grid";
import { buttonVariants } from "@/components/ui/button";
import { getAppLoginUrl } from "@/lib/auth/urls";
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
  const loginUrl = getAppLoginUrl();

  return (
    <>
      <section className="page-shell relative grid min-h-[calc(100vh-5rem)] items-center gap-12 py-16 lg:grid-cols-[1.08fr_.92fr] lg:py-20">
        <div className="bg-primary/10 glow-pulse pointer-events-none absolute top-8 right-[8%] size-72 rounded-full blur-[100px]" />
        <div className="relative z-10">
          <p className="eyebrow">Premium pickleball visuals</p>
          <h1 className="reveal-up font-heading mt-6 max-w-5xl text-6xl leading-[0.86] font-bold tracking-[-0.075em] sm:text-8xl lg:text-[7.5rem]">
            YOUR GAME.
            <br />
            <span className="text-gradient">OUR FRAME.</span>
          </h1>
          <p className="reveal-up reveal-delay-1 mt-8 max-w-xl text-lg leading-8 text-neutral-600">
            Premium custom posters for pickleball athletes—built for your
            tournament, your story, and your next big post.
          </p>
          <div className="reveal-up reveal-delay-2 mt-9 flex flex-wrap gap-3">
            <Link
              href={loginUrl}
              className={cn(
                buttonVariants({ size: "lg" }),
                "rounded-full px-6 font-bold",
              )}
            >
              Create your frame <ArrowRight />
            </Link>
            <Link
              href="/work"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "rounded-full border-black/12 bg-white/70 px-6 text-black shadow-sm hover:bg-white hover:text-black",
              )}
            >
              View our work
            </Link>
          </div>
        </div>
        <div className="relative mx-auto w-full max-w-lg py-8 lg:py-0">
          <div className="border-primary/25 bg-primary/10 absolute inset-8 rotate-6 rounded-[2.5rem] border blur-sm" />
          <div className="float-soft relative aspect-[4/5] overflow-hidden rounded-[2.25rem] border border-black/15 bg-[#10120f] p-7 text-white shadow-[0_35px_100px_rgba(41,50,20,.22)] sm:p-9">
            <div className="court-grid absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent)] opacity-40" />
            <div className="bg-primary/25 absolute -top-20 -right-20 size-64 rounded-full blur-3xl" />
            <div className="bg-primary absolute inset-x-8 top-[42%] h-px rotate-[-12deg] shadow-[0_0_20px_#d8ff36]" />
            <div className="relative flex h-full flex-col justify-between">
              <div className="flex items-start justify-between">
                <p className="text-[10px] font-bold tracking-[0.28em] text-neutral-400 uppercase">
                  DINKFRAME / 001
                </p>
                <Sparkles className="text-primary size-5" />
              </div>
              <Image
                src="/upscaledlogo.png"
                width={1254}
                height={1254}
                alt="DINKFRAME"
                preload
                className="absolute top-[4%] left-1/2 w-[82%] -translate-x-1/2 object-contain opacity-95"
              />
              <div>
                <p className="text-primary text-xs font-bold tracking-[0.22em] uppercase">
                  Tournament visual system
                </p>
                <p className="font-heading mt-3 text-6xl leading-[.78] font-bold tracking-[-0.08em] sm:text-7xl">
                  OWN
                  <br />
                  THE
                  <br />
                  COURT.
                </p>
              </div>
            </div>
          </div>
          <div className="absolute -right-3 bottom-16 rounded-2xl border border-black/10 bg-white px-4 py-3 text-xs text-black shadow-2xl sm:-right-8">
            <span className="bg-primary mr-2 inline-block size-2 rounded-full shadow-[0_0_12px_#d8ff36]" />{" "}
            Social-ready output
          </div>
        </div>
      </section>

      <div className="overflow-hidden border-y border-black/8 bg-black/[.025] py-4">
        <div className="marquee-track font-heading flex gap-9 text-sm font-bold tracking-[0.22em] text-neutral-500 uppercase">
          {Array.from({ length: 2 }).map((_, group) => (
            <div key={group} className="flex gap-9">
              {[
                "Tournament posters",
                "Player announcements",
                "Match moments",
                "Social-ready design",
                "Made in Malaysia",
              ].map((item) => (
                <span
                  key={`${group}-${item}`}
                  className="flex items-center gap-9 whitespace-nowrap"
                >
                  {item}
                  <span className="text-primary">✦</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <section className="border-b border-black/8 py-24 sm:py-32">
        <div className="page-shell">
          <p className="eyebrow">Why DINKFRAME</p>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {benefits.map(([Icon, title, copy]) => (
              <article
                key={title}
                className="interactive-card glass-panel group rounded-3xl p-7"
              >
                <span className="bg-primary/10 text-primary group-hover:bg-primary grid size-11 place-items-center rounded-2xl transition duration-500 group-hover:rotate-6 group-hover:text-black">
                  <Icon className="size-5" />
                </span>
                <h2 className="mt-12 text-lg font-bold">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-neutral-600">
                  {copy}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="page-shell py-24 sm:py-32">
        <div className="mb-10 flex items-end justify-between gap-6">
          <div>
            <p className="eyebrow">Packages</p>
            <h2 className="font-heading mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
              Pick your frame count.
            </h2>
          </div>
          <Link
            href="/packages"
            className="hidden text-sm font-semibold text-neutral-600 transition hover:text-black sm:block"
          >
            Compare packages
          </Link>
        </div>
        <PackageGrid />
      </section>

      <section className="bg-primary relative overflow-hidden py-20 text-black sm:py-24">
        <div className="court-grid absolute inset-0 opacity-30" />
        <div className="page-shell flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-end">
          <h2 className="font-heading relative max-w-4xl text-5xl leading-[.92] font-bold tracking-[-0.06em] sm:text-7xl">
            READY TO FRAME YOUR NEXT TOURNAMENT?
          </h2>
          <Link
            href={loginUrl}
            className={cn(
              buttonVariants({ size: "lg" }),
              "relative shrink-0 rounded-full bg-black px-6 text-white shadow-2xl hover:bg-neutral-900",
            )}
          >
            Book your frame <ArrowRight />
          </Link>
        </div>
      </section>
    </>
  );
}
