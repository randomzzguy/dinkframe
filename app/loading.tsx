export default function Loading() {
  return (
    <div className="page-shell grid min-h-[50vh] place-items-center py-20">
      <div className="text-center">
        <div className="bg-primary mx-auto size-10 animate-pulse rounded-full" />
        <p className="mt-4 text-sm font-semibold text-neutral-500">
          Loading your frame…
        </p>
      </div>
    </div>
  );
}
