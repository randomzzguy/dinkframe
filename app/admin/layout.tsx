import type { Metadata } from "next";

import { AppShell } from "@/components/shared/app-shell";
import { requireAdmin } from "@/lib/auth/guards";

export const metadata: Metadata = {
  title: { default: "Studio admin", template: "%s — DINKFRAME Admin" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  return <AppShell admin>{children}</AppShell>;
}
