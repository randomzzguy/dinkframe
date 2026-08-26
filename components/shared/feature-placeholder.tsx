export function FeaturePlaceholder({
  title,
  description,
  items = [],
}: {
  title: string;
  description: string;
  items?: string[];
}) {
  return (
    <div>
      <p className="eyebrow">Foundation scaffold</p>
      <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">
        {title}
      </h1>
      <p className="mt-4 max-w-2xl leading-7 text-neutral-600">{description}</p>
      {items.length > 0 && (
        <div className="mt-8 grid gap-3 md:grid-cols-2">
          {items.map((item) => (
            <div
              key={item}
              className="rounded-xl border border-black/10 bg-white p-4 text-sm font-medium"
            >
              {item}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
