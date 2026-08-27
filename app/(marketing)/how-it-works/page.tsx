import {
  ClipboardList,
  CreditCard,
  Download,
  MessageSquareMore,
  WandSparkles,
} from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "How it works" };

const steps = [
  { title: "Submit your details", icon: ClipboardList },
  { title: "Confirm payment", icon: CreditCard },
  { title: "We create your poster", icon: WandSparkles },
  { title: "Review & amendments", icon: MessageSquareMore },
  { title: "Receive your final poster", icon: Download },
] as const;

export default function HowItWorksPage() {
  return (
    <section className="page-shell py-20 sm:py-32">
      <p className="eyebrow">How it works</p>
      <h1 className="reveal-up font-heading mt-5 max-w-5xl text-6xl leading-[.88] font-bold tracking-[-0.065em] sm:text-8xl">
        UPLOAD. CHOOSE. PAY. DONE.
      </h1>
      <ol className="mt-16 grid gap-4 lg:grid-cols-5">
        {steps.map(({ title, icon: Icon }, index) => (
          <li
            key={title}
            className="interactive-card glass-panel group flex min-h-72 flex-col rounded-3xl p-7"
          >
            <span className="text-primary font-mono text-sm font-bold">
              0{index + 1}
            </span>
            <div className="flex flex-1 items-center justify-center py-8">
              <span className="group-hover:bg-primary grid size-20 place-items-center rounded-3xl border border-black/8 bg-[#f2f5e9] transition duration-500 group-hover:-translate-y-1 group-hover:rotate-3 group-hover:shadow-[0_12px_35px_rgba(168,205,30,.24)]">
                <Icon className="size-9 stroke-[1.5]" aria-hidden="true" />
              </span>
            </div>
            <div className="group-hover:bg-primary h-px w-10 bg-black/15 transition-all duration-500 group-hover:w-full" />
            <h2 className="font-heading mt-5 text-xl font-bold">{title}</h2>
          </li>
        ))}
      </ol>
    </section>
  );
}
