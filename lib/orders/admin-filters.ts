import type { Database } from "@/lib/types/database";
import type { OrderStatus } from "@/lib/types/domain";

type Order = Database["public"]["Tables"]["orders"]["Row"];

export type AdminOrderFilters = {
  query?: string;
  status?: OrderStatus;
  packageId?: string;
  tournament?: string;
  player?: string;
  dateFrom?: string;
  dateTo?: string;
};

export function filterAdminOrders(
  orders: Order[],
  clientEmails: Map<string, string>,
  filters: AdminOrderFilters,
) {
  const query = normalize(filters.query);
  const tournament = normalize(filters.tournament);
  const player = normalize(filters.player);

  return orders.filter((order) => {
    if (filters.status && order.status !== filters.status) return false;
    if (filters.packageId && order.package_id !== filters.packageId)
      return false;
    if (filters.dateFrom && order.created_at.slice(0, 10) < filters.dateFrom)
      return false;
    if (filters.dateTo && order.created_at.slice(0, 10) > filters.dateTo)
      return false;
    if (tournament && !normalize(order.tournament_name).includes(tournament))
      return false;
    if (player && !normalize(order.player_name).includes(player)) return false;

    if (query) {
      const haystack = [
        order.order_number,
        order.player_name,
        order.tournament_name,
        order.whatsapp,
        clientEmails.get(order.client_id) ?? "",
      ]
        .map(normalize)
        .join(" ");
      if (!haystack.includes(query)) return false;
    }

    return true;
  });
}

function normalize(value: string | undefined) {
  return value?.trim().toLocaleLowerCase("en") ?? "";
}
