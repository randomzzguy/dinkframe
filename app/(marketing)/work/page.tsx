import type { Metadata } from "next";

export const metadata: Metadata = { title: "Work" };

const work = [
  ["Centre Court", "Tournament campaign", "bg-[#151515] text-lime-300"],
  ["Match Point", "Athlete announcement", "bg-[#5537e8] text-white"],
  ["Next Gen", "Junior athlete poster", "bg-[#d8ff36] text-black"],
] as const;

export default function WorkPage() {
  return (
    <section className="page-shell py-20 sm:py-28">
      <p className="eyebrow">Selected frames</p>
      <h1 className="mt-4 text-6xl font-black tracking-[-0.06em] sm:text-8xl">
        WORK THAT PLAYS LOUD.
      </h1>
      <p className="mt-6 max-w-xl text-lg leading-8 text-neutral-600">
        Portfolio items are configured locally for v1 and ready to be replaced
        with final DINKFRAME artwork.
      </p>
      <div className="mt-14 grid gap-5 md:grid-cols-3">
        {work.map(([title, category, style], index) => (
          <article
            key={title}
            className={`aspect-[4/5] rounded-2xl p-7 ${style}`}
          >
            <div className="flex h-full flex-col justify-between">
              <p className="text-xs tracking-widest uppercase">
                DF / 00{index + 1}
              </p>
              <div>
                <p className="text-sm uppercase opacity-70">{category}</p>
                <h2 className="mt-2 text-4xl font-black tracking-tight">
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
