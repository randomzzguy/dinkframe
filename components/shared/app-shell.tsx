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
    <div className="min-h-screen bg-[#f7f7f2]">
      <header className="border-b border-black/10 bg-white">
        <div className="page-shell flex min-h-17 items-center justify-between gap-5">
          <div className="flex items-center gap-8">
            <Logo className="text-xl" />
            <span className="hidden rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase sm:inline">
              {admin ? "Studio admin" : "Client portal"}
            </span>
          </div>
          <form action={signOut}>
            <Button type="submit" variant="ghost" size="sm">
              <LogOut /> Sign out
            </Button>
          </form>
        </div>
        <nav
          aria-label={admin ? "Admin" : "Client"}
          className="page-shell flex gap-6 overflow-x-auto"
        >
          {links.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className="hover:border-primary border-b-2 border-transparent py-3 text-sm font-medium text-neutral-600 hover:text-black"
            >
              {label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="page-shell py-8 sm:py-12">{children}</main>
    </div>
  );
}
