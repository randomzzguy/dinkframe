import { LogOut } from "lucide-react";
import Link from "next/link";

import { signOut } from "@/app/(auth)/login/actions";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export function AppShell({
  children,
  admin = false,
}: {
  children: React.ReactNode;
  admin?: boolean;
}) {
  const links = admin
    ? [
        ["Overview", "/admin"],
        ["Orders", "/admin/orders"],
        ["Settings", "/admin/settings"],
      ]
    : [
        ["Orders", "/dashboard"],
        ["New order", "/orders/new"],
        ["Profile", "/profile"],
      ];

  return (
    <div className="app-canvas min-h-screen">
      <header className="sticky top-0 z-40 border-b border-black/8 bg-white/88 text-neutral-950 shadow-[0_10px_40px_rgba(30,40,10,.06)] backdrop-blur-2xl">
        <div className="page-shell flex min-h-18 items-center justify-between gap-5">
          <div className="flex items-center gap-8">
            <Logo className="text-lg" />
            <span className="border-primary/20 bg-primary/10 text-primary hidden rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase sm:inline">
              {admin ? "Studio admin" : "Client portal"}
            </span>
          </div>
          <form action={signOut}>
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="text-neutral-500 hover:bg-neutral-100 hover:text-black"
            >
              <LogOut /> Sign out
            </Button>
          </form>
        </div>
        <nav
          aria-label={admin ? "Admin" : "Client"}
          className="page-shell flex gap-2 overflow-x-auto pb-2"
        >
          {links.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className="hover:bg-primary/20 rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 transition duration-300 hover:text-black"
            >
              {label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="page-shell reveal-up py-8 sm:py-12">{children}</main>
    </div>
  );
}
