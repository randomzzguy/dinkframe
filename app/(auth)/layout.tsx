import { Logo } from "@/components/brand/logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="grid min-h-screen bg-neutral-950 p-5 text-white lg:grid-cols-2 lg:p-0">
      <section className="bg-primary hidden flex-col justify-between overflow-hidden p-12 text-black lg:flex">
        <Logo className="text-2xl" />
        <h2 className="max-w-2xl text-7xl leading-[.88] font-black tracking-[-0.07em]">
          YOUR NEXT FRAME STARTS HERE.
        </h2>
        <p className="text-sm font-semibold tracking-widest uppercase">
          Upload → choose style → pay → done
        </p>
      </section>
      <section className="flex items-center justify-center p-5 sm:p-12">
        {children}
      </section>
    </main>
  );
}
