import { describe, expect, it } from "vitest";

import { getAdminOrderActionDestination } from "./admin-order-action";

const orderId = "00000000-0000-4000-8000-000000000042";

describe("admin email order actions", () => {
  it("maps allowlisted decisions to internal admin pages", () => {
    expect(
      getAdminOrderActionDestination({ order: orderId, decision: "confirm" }),
    ).toBe(`/admin/orders/${orderId}?paymentAction=confirm`);
    expect(
      getAdminOrderActionDestination({ order: orderId, decision: "reject" }),
    ).toBe(`/admin/orders/${orderId}?paymentAction=reject`);
    expect(
      getAdminOrderActionDestination({ order: orderId, decision: "open" }),
    ).toBe(`/admin/orders/${orderId}`);
  });

  it("rejects invalid order IDs and decisions", () => {
    expect(
      getAdminOrderActionDestination({
        order: "../../dashboard",
        decision: "confirm",
      }),
    ).toBeNull();
    expect(
      getAdminOrderActionDestination({ order: orderId, decision: "delete" }),
    ).toBeNull();
  });
});
