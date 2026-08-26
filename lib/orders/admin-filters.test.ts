import { describe, expect, it } from "vitest";

import { filterAdminOrders } from "@/lib/orders/admin-filters";
import type { Database } from "@/lib/types/database";

type Order = Database["public"]["Tables"]["orders"]["Row"];

const baseOrder = {
  id: "order-1",
  client_id: "client-1",
  order_number: "DF-2026-0001",
  player_name: "Aisyah Lee",
  tournament_name: "Kuala Lumpur Open",
  whatsapp: "+60123456789",
  package_id: "package-1",
  status: "request_received",
  created_at: "2026-08-20T10:00:00.000Z",
} as Order;

describe("admin order filters", () => {
  const emails = new Map([["client-1", "aisyah@example.com"]]);

  it("searches order, contact, and email fields", () => {
    expect(
      filterAdminOrders([baseOrder], emails, { query: "EXAMPLE" }),
    ).toHaveLength(1);
    expect(
      filterAdminOrders([baseOrder], emails, { query: "0001" }),
    ).toHaveLength(1);
    expect(
      filterAdminOrders([baseOrder], emails, { query: "missing" }),
    ).toHaveLength(0);
  });

  it("combines structured filters", () => {
    expect(
      filterAdminOrders([baseOrder], emails, {
        status: "request_received",
        packageId: "package-1",
        dateFrom: "2026-08-20",
        dateTo: "2026-08-20",
        tournament: "lumpur",
        player: "aisyah",
      }),
    ).toHaveLength(1);
  });
});
