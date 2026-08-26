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
    <section className="page-shell py-20 sm:py-28">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="mt-4 max-w-4xl text-6xl font-black tracking-[-0.06em] sm:text-8xl">
        {title}
      </h1>
      <div className="mt-10 max-w-2xl space-y-5 text-base leading-8 text-neutral-600">
        {children}
      </div>
    </section>
  );
}
