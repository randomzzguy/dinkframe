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
    <section className="page-shell py-20 sm:py-28">
      <p className="eyebrow">How it works</p>
      <h1 className="mt-4 max-w-4xl text-6xl font-black tracking-[-0.06em] sm:text-8xl">
        UPLOAD. CHOOSE. PAY. DONE.
      </h1>
      <ol className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-black/10 bg-black/10 lg:grid-cols-5">
        {steps.map((step, index) => (
          <li key={step} className="bg-white p-7">
            <span className="text-sm font-black text-neutral-400">
              0{index + 1}
            </span>
            <h2 className="mt-16 text-xl font-bold">{step}</h2>
          </li>
        ))}
      </ol>
    </section>
  );
}
