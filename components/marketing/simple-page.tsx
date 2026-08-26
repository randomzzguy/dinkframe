export function SimplePage({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="page-shell relative py-20 sm:py-32">
      <div className="bg-primary/8 absolute top-20 right-10 size-64 rounded-full blur-3xl" />
      <div className="relative">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="reveal-up font-heading mt-5 max-w-5xl text-6xl leading-[.9] font-bold tracking-[-0.065em] sm:text-8xl">
          {title}
        </h1>
        <div className="glass-panel mt-12 max-w-3xl space-y-5 rounded-3xl p-7 text-base leading-8 text-neutral-300 sm:p-10">
          {children}
        </div>
      </div>
    </section>
  );
}
