import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = { title: "Work" };

const work = [
  {
    src: "/1.png",
    title: "Loh Yih Ern",
    event: "APP Asia Utsunomiya Qualifier Series",
    location: "Utsunomiya, Japan",
    alt: "Blue tournament poster for Loh Yih Ern at the APP Asia Utsunomiya Qualifier Series",
  },
  {
    src: "/2.png",
    title: "Farreez Isqandar",
    event: "PPA Asia 125 Tomaz Cup",
    location: "Kuala Lumpur, Malaysia",
    alt: "White and green tournament poster for Farreez Isqandar at the Tomaz Cup",
  },
  {
    src: "/3.png",
    title: "Farreez Isqandar",
    event: "APP Asia Penang Open",
    location: "Penang, Malaysia",
    alt: "Blue tournament poster for Farreez Isqandar at the APP Asia Penang Open",
  },
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
      <div className="mt-14 grid gap-x-5 gap-y-10 md:grid-cols-3">
        {work.map((item, index) => (
          <article key={`${item.event}-${item.title}`} className="group">
            <div className="interactive-card relative aspect-[4/5] overflow-hidden rounded-3xl border border-black/10 bg-neutral-900 shadow-[0_18px_55px_rgba(41,50,20,.14)]">
              <Image
                src={item.src}
                alt={item.alt}
                fill
                sizes="(max-width: 767px) 100vw, 33vw"
                className="object-cover transition duration-700 ease-out group-hover:scale-[1.035]"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-black/10 opacity-70 transition duration-500 group-hover:opacity-30" />
              <span className="absolute top-4 left-4 rounded-full border border-white/20 bg-black/35 px-3 py-1.5 font-mono text-[10px] font-bold tracking-[0.18em] text-white uppercase backdrop-blur-md">
                DF / 00{index + 1}
              </span>
            </div>
            <div className="mt-5 flex items-start justify-between gap-5 px-1">
              <div>
                <p className="text-xs font-bold tracking-[0.16em] text-[#587000] uppercase">
                  {item.event}
                </p>
                <h2 className="font-heading mt-1.5 text-3xl font-bold tracking-tight">
                  {item.title}
                </h2>
              </div>
              <p className="max-w-28 pt-0.5 text-right text-xs leading-5 text-neutral-500">
                {item.location}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
