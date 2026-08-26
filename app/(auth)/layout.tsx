import { Logo } from "@/components/brand/logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="relative grid min-h-screen overflow-hidden bg-[#f6f8ef] p-5 text-neutral-950 lg:grid-cols-2 lg:p-0">
      <div className="bg-primary/35 absolute top-0 right-0 size-[32rem] rounded-full blur-[120px]" />
      <section className="bg-primary relative hidden flex-col justify-between overflow-hidden border-r border-black/8 p-12 text-black lg:flex">
        <div className="court-grid absolute inset-0 opacity-50" />
        <Logo className="relative text-xl" />
        <div className="relative">
          <h2 className="font-heading max-w-2xl text-7xl leading-[.86] font-bold tracking-[-0.07em]">
            YOUR NEXT FRAME STARTS HERE.
          </h2>
        </div>
        <p className="relative text-sm font-semibold tracking-widest uppercase">
          Upload → choose style → pay → done
        </p>
      </section>
      <section className="relative flex items-center justify-center p-5 sm:p-12">
        {children}
      </section>
    </main>
  );
}
