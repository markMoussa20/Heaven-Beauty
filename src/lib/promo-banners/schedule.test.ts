import { describe, expect, it } from "vitest";

import {
  bannersOverlap,
  getBannerStatus,
  isWithinSchedule,
  normalizeWallClock,
  pickActiveBanner,
  resolveCountryTimeZone,
  wallClockIn,
  type SchedulableBanner,
  type ScheduleCountry,
} from "./schedule";

const UAE: ScheduleCountry = { id: "ae", code: "AE", timezone: "Asia/Dubai" }; // UTC+4, no DST
const EGYPT: ScheduleCountry = { id: "eg", code: "EG", timezone: "Africa/Cairo" }; // UTC+3 in Sept (DST)
const LEBANON: ScheduleCountry = { id: "lb", code: "LB", timezone: "Asia/Beirut" };

function banner(overrides: Partial<SchedulableBanner> = {}): SchedulableBanner {
  return {
    id: "b1",
    is_enabled: true,
    all_countries: true,
    country_ids: [],
    priority: 0,
    starts_at: null,
    ends_at: null,
    created_at: "2026-09-01T00:00:00Z",
    ...overrides,
  };
}

describe("normalizeWallClock", () => {
  it("accepts datetime-local, postgres and fractional formats", () => {
    expect(normalizeWallClock("2026-09-09T00:00")).toBe("2026-09-09T00:00:00");
    expect(normalizeWallClock("2026-09-09 13:45:10")).toBe("2026-09-09T13:45:10");
    expect(normalizeWallClock("2026-09-09T13:45:10.123")).toBe("2026-09-09T13:45:10");
  });

  it("rejects empty and malformed values", () => {
    expect(normalizeWallClock("")).toBeNull();
    expect(normalizeWallClock(null)).toBeNull();
    expect(normalizeWallClock("09/09/2026")).toBeNull();
  });
});

describe("wallClockIn", () => {
  it("converts an instant to the country's local wall clock", () => {
    const now = new Date("2026-09-08T20:30:00Z");
    expect(wallClockIn(now, "Asia/Dubai")).toBe("2026-09-09T00:30:00");
    expect(wallClockIn(now, "Africa/Cairo")).toBe("2026-09-08T23:30:00");
    expect(wallClockIn(now, "UTC")).toBe("2026-09-08T20:30:00");
  });

  it("uses 00 rather than 24 for midnight", () => {
    expect(wallClockIn(new Date("2026-09-08T20:00:00Z"), "Asia/Dubai")).toBe("2026-09-09T00:00:00");
  });
});

describe("isWithinSchedule", () => {
  const window = { starts_at: "2026-09-09T00:00:00", ends_at: "2026-09-12T00:00:00" };

  it("starts at local midnight in each country independently", () => {
    // 20:00 UTC = 00:00 Dubai, but only 23:00 Cairo.
    const now = new Date("2026-09-08T20:00:00Z");
    expect(isWithinSchedule(window, now, "Asia/Dubai")).toBe(true);
    expect(isWithinSchedule(window, now, "Africa/Cairo")).toBe(false);
    // One hour later Cairo reaches midnight too.
    expect(isWithinSchedule(window, new Date("2026-09-08T21:00:00Z"), "Africa/Cairo")).toBe(true);
  });

  it("treats the end as exclusive", () => {
    expect(isWithinSchedule(window, new Date("2026-09-11T19:59:59Z"), "Asia/Dubai")).toBe(true);
    expect(isWithinSchedule(window, new Date("2026-09-11T20:00:00Z"), "Asia/Dubai")).toBe(false);
  });

  it("treats missing bounds as unlimited", () => {
    const now = new Date("2030-01-01T00:00:00Z");
    expect(isWithinSchedule({}, now, "UTC")).toBe(true);
    expect(isWithinSchedule({ starts_at: "2026-01-01T00:00" }, now, "UTC")).toBe(true);
    expect(isWithinSchedule({ ends_at: "2026-01-01T00:00" }, now, "UTC")).toBe(false);
  });

  it("handles a DST spring-forward gap by going live once the clock passes the start", () => {
    // Beirut springs forward on 2026-03-29 at 00:00 -> 01:00. 00:30 never exists locally.
    const gapWindow = { starts_at: "2026-03-29T00:30:00" };
    expect(isWithinSchedule(gapWindow, new Date("2026-03-28T21:59:00Z"), "Asia/Beirut")).toBe(false);
    expect(isWithinSchedule(gapWindow, new Date("2026-03-28T22:00:00Z"), "Asia/Beirut")).toBe(true);
  });
});

describe("resolveCountryTimeZone", () => {
  it("prefers a valid stored timezone", () => {
    expect(resolveCountryTimeZone({ code: "AE", timezone: "Europe/London" })).toBe("Europe/London");
  });

  it("falls back to known country defaults, then UTC", () => {
    expect(resolveCountryTimeZone({ code: "jo", timezone: null })).toBe("Asia/Amman");
    expect(resolveCountryTimeZone({ code: "EG", timezone: "Not/AZone" })).toBe("Africa/Cairo");
    expect(resolveCountryTimeZone({ code: "FR", timezone: undefined })).toBe("UTC");
  });
});

describe("pickActiveBanner", () => {
  const now = new Date("2026-09-10T12:00:00Z");

  it("returns null when nothing is live", () => {
    expect(pickActiveBanner([banner({ is_enabled: false })], UAE, now)).toBeNull();
    expect(pickActiveBanner([banner({ ends_at: "2026-09-01T00:00" })], UAE, now)).toBeNull();
  });

  it("only shows banners that target the country", () => {
    const egyptOnly = banner({ all_countries: false, country_ids: [EGYPT.id] });
    expect(pickActiveBanner([egyptOnly], UAE, now)).toBeNull();
    expect(pickActiveBanner([egyptOnly], EGYPT, now)?.id).toBe("b1");
  });

  it("picks the highest priority, then the latest start, then the newest", () => {
    const low = banner({ id: "low", priority: 0, starts_at: "2026-09-10T00:00" });
    const high = banner({ id: "high", priority: 5, starts_at: "2026-09-01T00:00" });
    expect(pickActiveBanner([low, high], UAE, now)?.id).toBe("high");

    const older = banner({ id: "older", starts_at: "2026-09-01T00:00" });
    const newer = banner({ id: "newer", starts_at: "2026-09-05T00:00" });
    const openEnded = banner({ id: "open", starts_at: null });
    expect(pickActiveBanner([older, openEnded, newer], UAE, now)?.id).toBe("newer");

    const first = banner({ id: "first", created_at: "2026-09-01T00:00:00Z" });
    const second = banner({ id: "second", created_at: "2026-09-02T00:00:00Z" });
    expect(pickActiveBanner([first, second], UAE, now)?.id).toBe("second");
  });
});

describe("getBannerStatus", () => {
  const countries = [UAE, EGYPT, LEBANON];

  it("reports disabled and missing countries", () => {
    expect(getBannerStatus(banner({ is_enabled: false }), countries, new Date()).kind).toBe("disabled");
    expect(
      getBannerStatus(banner({ all_countries: false, country_ids: [] }), countries, new Date()).kind,
    ).toBe("no-countries");
  });

  it("lists only the countries where the banner is currently live", () => {
    const status = getBannerStatus(
      banner({ starts_at: "2026-09-09T00:00" }),
      countries,
      new Date("2026-09-08T20:30:00Z"), // 00:30 Dubai, 23:30 Cairo & Beirut
    );
    expect(status).toEqual({ kind: "live", countryIds: ["ae"] });
  });

  it("distinguishes scheduled from expired", () => {
    const now = new Date("2026-09-10T12:00:00Z");
    expect(getBannerStatus(banner({ starts_at: "2026-10-01T00:00" }), countries, now).kind).toBe("scheduled");
    expect(getBannerStatus(banner({ ends_at: "2026-09-01T00:00" }), countries, now).kind).toBe("expired");
  });
});

describe("bannersOverlap", () => {
  it("detects intersecting windows on a shared country", () => {
    const a = banner({ id: "a", starts_at: "2026-09-01T00:00", ends_at: "2026-09-10T00:00" });
    const b = banner({ id: "b", starts_at: "2026-09-09T00:00", ends_at: "2026-09-20T00:00" });
    expect(bannersOverlap(a, b)).toBe(true);
  });

  it("ignores back-to-back windows, different countries and disabled banners", () => {
    const a = banner({ id: "a", ends_at: "2026-09-10T00:00" });
    const b = banner({ id: "b", starts_at: "2026-09-10T00:00" });
    expect(bannersOverlap(a, b)).toBe(false);

    const uae = banner({ id: "c", all_countries: false, country_ids: ["ae"] });
    const egypt = banner({ id: "d", all_countries: false, country_ids: ["eg"] });
    expect(bannersOverlap(uae, egypt)).toBe(false);

    expect(bannersOverlap(banner({ id: "e" }), banner({ id: "f", is_enabled: false }))).toBe(false);
  });
});
