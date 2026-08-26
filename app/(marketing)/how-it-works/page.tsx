import type { Metadata } from "next";

export const metadata: Metadata = { title: "How it works" };

const steps = [
  "Submit your details",
  "Confirm payment",
  "We create your poster",
  "Review & amendments",
  "Receive your final poster",
];

export default function HowItWorksPage() {
  return (
    <section className="page-shell py-20 sm:py-32">
      <p className="eyebrow">How it works</p>
      <h1 className="reveal-up font-heading mt-5 max-w-5xl text-6xl leading-[.88] font-bold tracking-[-0.065em] sm:text-8xl">
        UPLOAD. CHOOSE. PAY. DONE.
      </h1>
      <ol className="mt-16 grid gap-4 lg:grid-cols-5">
        {steps.map((step, index) => (
          <li
            key={step}
            className="interactive-card glass-panel group rounded-3xl p-7"
          >
            <span className="text-primary font-mono text-sm font-bold">
              0{index + 1}
            </span>
            <div className="group-hover:bg-primary mt-16 h-px w-10 bg-black/15 transition-all duration-500 group-hover:w-full" />
            <h2 className="font-heading mt-5 text-xl font-bold">{step}</h2>
          </li>
        ))}
      </ol>
    </section>
  );
}
