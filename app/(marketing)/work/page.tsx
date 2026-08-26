import type { Metadata } from "next";

export const metadata: Metadata = { title: "Work" };

const work = [
  [
    "Centre Court",
    "Tournament campaign",
    "from-[#181b15] to-[#0b0b0b] text-lime-300",
  ],
  [
    "Match Point",
    "Athlete announcement",
    "from-[#694cff] to-[#201453] text-white",
  ],
  [
    "Next Gen",
    "Junior athlete poster",
    "from-[#e6ff73] to-[#9fca00] text-black",
  ],
] as const;

export default function WorkPage() {
  return (
    <section className="page-shell py-20 sm:py-32">
      <p className="eyebrow">Selected frames</p>
      <h1 className="reveal-up font-heading mt-5 text-6xl leading-[.88] font-bold tracking-[-0.065em] sm:text-8xl">
        WORK THAT PLAYS LOUD.
      </h1>
      <p className="mt-7 max-w-xl text-lg leading-8 text-neutral-600">
        Bold, player-first visual directions built to make tournament moments
        feel as big online as they did on court.
      </p>
      <div className="mt-14 grid gap-5 md:grid-cols-3">
        {work.map(([title, category, style], index) => (
          <article
            key={title}
            className={`interactive-card group relative aspect-[4/5] overflow-hidden rounded-3xl border border-black/10 bg-gradient-to-br p-7 shadow-[0_18px_55px_rgba(41,50,20,.1)] ${style}`}
          >
            <div className="court-grid absolute inset-0 opacity-20 transition duration-700 group-hover:scale-110" />
            <div className="absolute top-1/4 -right-16 size-48 rounded-full bg-white/15 blur-3xl transition duration-700 group-hover:scale-125" />
            <div className="flex h-full flex-col justify-between">
              <p className="text-xs tracking-widest uppercase">
                DF / 00{index + 1}
              </p>
              <div className="relative transition-transform duration-500 group-hover:-translate-y-2">
                <p className="text-sm uppercase opacity-70">{category}</p>
                <h2 className="font-heading mt-2 text-4xl font-bold tracking-tight">
                  {title}
                </h2>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
