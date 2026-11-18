import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: vi.fn() }));
vi.mock("@/lib/order-notifications", () => ({ sendStaffAlertEmail: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

const { allowProblemEmail } = await import("@/lib/checkout/problem-report");

describe("allowProblemEmail", () => {
  it("lets one visitor cause at most 5 emails in 10 minutes", () => {
    const start = 1_000_000;
    const results = Array.from({ length: 7 }, (_, i) => allowProblemEmail("visitor-a", start + i));
    expect(results).toEqual([true, true, true, true, true, false, false]);
  });

  it("allows that visitor again once the 10 minutes have passed", () => {
    expect(allowProblemEmail("visitor-a", 1_000_000 + 10 * 60 * 1000 + 10)).toBe(true);
  });

  it("limits each visitor separately", () => {
    expect(allowProblemEmail("visitor-b", 1_000_000)).toBe(true);
  });
});
