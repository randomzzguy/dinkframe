import Link from "next/link";

import {
  OrderStatusBadge,
  PaymentStatusBadge,
} from "@/components/orders/status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireAdmin } from "@/lib/auth/guards";
import {
  filterAdminOrders,
  type AdminOrderFilters,
} from "@/lib/orders/admin-filters";
import {
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
} from "@/lib/orders/status";
import {
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  type OrderStatus,
  type PaymentStatus,
} from "@/lib/types/domain";
import { cn } from "@/lib/utils";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const rawFilters = await searchParams;
  const filters = readFilters(rawFilters);
  const { supabase } = await requireAdmin();
  const [ordersResult, profilesResult, packagesResult] = await Promise.all([
    supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500),
    supabase.from("profiles").select("id, email"),
    supabase.from("packages").select("id, name").order("sort_order"),
  ]);
  const clientEmails = new Map(
    (profilesResult.data ?? []).map((profile) => [profile.id, profile.email]),
  );
  const orders = filterAdminOrders(
    ordersResult.data ?? [],
    clientEmails,
    filters,
  );
  const queueTitle = filters.paymentStatus
    ? filters.paymentStatus === "proof_uploaded"
      ? "Awaiting payment review."
      : `${PAYMENT_STATUS_LABELS[filters.paymentStatus]} payments.`
    : filters.status
      ? `${ORDER_STATUS_LABELS[filters.status]}.`
      : "All orders.";

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Order queue</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">
            {queueTitle}
          </h1>
        </div>
        <p className="text-sm text-neutral-500">
          {orders.length} result{orders.length === 1 ? "" : "s"}
        </p>
      </div>

      <form className="mt-8 rounded-2xl border border-black/10 bg-white p-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <FilterInput
            label="Search"
            name="q"
            value={first(rawFilters.q)}
            placeholder="Order, player, email, WhatsApp"
          />
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              name="status"
              defaultValue={filters.status ?? ""}
              className="border-input h-8 w-full rounded-lg border bg-white px-2.5 text-sm"
            >
              <option value="">All statuses</option>
              {ORDER_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {ORDER_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="paymentStatus">Payment</Label>
            <select
              id="paymentStatus"
              name="paymentStatus"
              defaultValue={filters.paymentStatus ?? ""}
              className="border-input h-8 w-full rounded-lg border bg-white px-2.5 text-sm"
            >
              <option value="">All payment states</option>
              {PAYMENT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {PAYMENT_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="packageId">Package</Label>
            <select
              id="packageId"
              name="packageId"
              defaultValue={filters.packageId ?? ""}
              className="border-input h-8 w-full rounded-lg border bg-white px-2.5 text-sm"
            >
              <option value="">All packages</option>
              {(packagesResult.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
          <FilterInput
            label="Tournament"
            name="tournament"
            value={first(rawFilters.tournament)}
          />
          <FilterInput
            label="Player"
            name="player"
            value={first(rawFilters.player)}
          />
          <FilterInput
            label="Created from"
            name="dateFrom"
            value={first(rawFilters.dateFrom)}
            type="date"
          />
          <FilterInput
            label="Created to"
            name="dateTo"
            value={first(rawFilters.dateTo)}
            type="date"
          />
          <div className="flex items-end gap-2">
            <Button type="submit">Apply filters</Button>
            <Link
              href="/admin/orders"
              className={cn(buttonVariants({ variant: "ghost" }))}
            >
              Reset
            </Link>
          </div>
        </div>
      </form>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-black/10 bg-white">
        <table className="w-full min-w-7xl text-left text-sm">
          <thead className="border-b bg-neutral-50 text-xs tracking-wide text-neutral-500 uppercase">
            <tr>
              <th className="p-4">Order</th>
              <th className="p-4">Player</th>
              <th className="p-4">Tournament</th>
              <th className="p-4">Package</th>
              <th className="p-4">Amount</th>
              <th className="p-4">Payment</th>
              <th className="p-4">Status</th>
              <th className="p-4">Created</th>
              <th className="p-4">Updated</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr
                key={order.id}
                className="border-b last:border-0 hover:bg-neutral-50"
              >
                <td className="p-4 font-bold">
                  <Link href={`/admin/orders/${order.id}`}>
                    {order.order_number}
                  </Link>
                </td>
                <td className="p-4">{order.player_name}</td>
                <td className="p-4">{order.tournament_name}</td>
                <td className="p-4">{order.package_name_snapshot}</td>
                <td className="p-4">RM{order.package_price_snapshot}</td>
                <td className="p-4">
                  <PaymentStatusBadge status={order.payment_status} />
                </td>
                <td className="p-4">
                  <OrderStatusBadge status={order.status} />
                </td>
                <td className="p-4 whitespace-nowrap">
                  {formatDate(order.created_at)}
                </td>
                <td className="p-4 whitespace-nowrap">
                  {formatDate(order.updated_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!orders.length && (
          <p className="p-10 text-center text-neutral-500">
            No orders match these filters.
          </p>
        )}
      </div>
    </>
  );
}

function FilterInput({
  label,
  name,
  value,
  placeholder,
  type = "text",
}: {
  label: string;
  name: string;
  value?: string;
  placeholder?: string;
  type?: "text" | "date";
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        defaultValue={value}
        placeholder={placeholder}
      />
    </div>
  );
}

function readFilters(params: SearchParams): AdminOrderFilters {
  const status = first(params.status);
  const paymentStatus = first(params.paymentStatus);
  return {
    query: first(params.q),
    status: ORDER_STATUSES.includes(status as OrderStatus)
      ? (status as OrderStatus)
      : undefined,
    paymentStatus: PAYMENT_STATUSES.includes(paymentStatus as PaymentStatus)
      ? (paymentStatus as PaymentStatus)
      : undefined,
    packageId: first(params.packageId),
    tournament: first(params.tournament),
    player: first(params.player),
    dateFrom: validDate(first(params.dateFrom)),
    dateTo: validDate(first(params.dateTo)),
  };
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function validDate(value: string | undefined) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-MY", { dateStyle: "medium" }).format(
    new Date(value),
  );
}
