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
      <header className="sticky top-0 z-40 border-b border-white/8 bg-[#0a0b0a]/92 text-white shadow-[0_10px_40px_rgba(0,0,0,.12)] backdrop-blur-2xl">
        <div className="page-shell flex min-h-18 items-center justify-between gap-5">
          <div className="flex items-center gap-8">
            <Logo inverse className="text-lg" />
            <span className="border-primary/20 bg-primary/10 text-primary hidden rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase sm:inline">
              {admin ? "Studio admin" : "Client portal"}
            </span>
          </div>
          <form action={signOut}>
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="text-neutral-400 hover:bg-white/8 hover:text-white"
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
              className="rounded-lg px-3 py-2 text-sm font-medium text-neutral-400 transition duration-300 hover:bg-white/8 hover:text-white"
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
