import Image from "next/image";
import { Logo } from "@/components/brand/logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="relative grid min-h-screen overflow-hidden bg-[#090a09] p-5 text-white lg:grid-cols-2 lg:p-0">
      <div className="bg-primary/8 absolute top-0 right-0 size-[32rem] rounded-full blur-[120px]" />
      <section className="relative hidden flex-col justify-between overflow-hidden border-r border-white/8 p-12 lg:flex">
        <div className="court-grid absolute inset-0 opacity-30" />
        <Logo inverse className="relative text-xl" />
        <div className="relative">
          <Image
            src="/upscaledlogo.png"
            width={1254}
            height={1254}
            alt="DINKFRAME"
            loading="eager"
            className="-mb-20 -ml-24 w-80 object-contain"
          />
          <h2 className="font-heading max-w-2xl text-7xl leading-[.86] font-bold tracking-[-0.07em]">
            YOUR NEXT FRAME STARTS HERE.
          </h2>
        </div>
        <p className="text-primary relative text-sm font-semibold tracking-widest uppercase">
          Upload → choose style → pay → done
        </p>
      </section>
      <section className="relative flex items-center justify-center p-5 sm:p-12">
        {children}
      </section>
    </main>
  );
}
