/**
 * Promo banner schedules are stored as wall-clock times ("2026-09-09T00:00:00")
 * with no timezone. Each target country evaluates them in its own timezone, so a
 * banner starting "9 Sep 00:00" goes live at midnight in Dubai for the UAE site
 * and at midnight in Cairo for the Egypt site.
 *
 * Everything here is pure so it can be unit tested without a database.
 */

export type ScheduleWindow = {
  starts_at?: string | null;
  ends_at?: string | null;
};

export type SchedulableBanner = ScheduleWindow & {
  id: string;
  is_enabled: boolean;
  all_countries: boolean;
  country_ids: string[];
  priority: number;
  created_at?: string | null;
};

export type ScheduleCountry = {
  id: string;
  code: string;
  timezone?: string | null;
};

export const DEFAULT_COUNTRY_TIMEZONES: Record<string, string> = {
  AE: "Asia/Dubai",
  LB: "Asia/Beirut",
  EG: "Africa/Cairo",
  JO: "Asia/Amman",
};

const WALL_CLOCK_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;

export function isValidTimeZone(timeZone: string | null | undefined): timeZone is string {
  if (!timeZone) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

export function resolveCountryTimeZone(country: Pick<ScheduleCountry, "code" | "timezone">) {
  if (isValidTimeZone(country.timezone)) return country.timezone;
  return DEFAULT_COUNTRY_TIMEZONES[country.code.toUpperCase()] ?? "UTC";
}

/**
 * Normalizes "YYYY-MM-DDTHH:mm", "YYYY-MM-DDTHH:mm:ss", Postgres' "YYYY-MM-DD HH:mm:ss"
 * and fractional seconds to "YYYY-MM-DDTHH:mm:ss" so values compare lexicographically.
 * Returns null for empty or malformed input.
 */
export function normalizeWallClock(value: string | null | undefined) {
  if (!value) return null;
  const candidate = value.trim().replace(" ", "T").replace(/\.\d+$/, "");
  if (!WALL_CLOCK_PATTERN.test(candidate)) return null;
  return candidate.length === 16 ? `${candidate}:00` : candidate;
}

/** Current wall-clock time in `timeZone`, formatted as "YYYY-MM-DDTHH:mm:ss". */
export function wallClockIn(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "00";

  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}`;
}

/** Start is inclusive, end is exclusive. A missing bound is unlimited. */
export function isWithinSchedule(window: ScheduleWindow, now: Date, timeZone: string) {
  const localNow = wallClockIn(now, timeZone);
  const start = normalizeWallClock(window.starts_at);
  const end = normalizeWallClock(window.ends_at);

  if (start && localNow < start) return false;
  if (end && localNow >= end) return false;
  return true;
}

export function targetsCountry(banner: Pick<SchedulableBanner, "all_countries" | "country_ids">, countryId: string) {
  return banner.all_countries || banner.country_ids.includes(countryId);
}

export function isBannerLive(banner: SchedulableBanner, country: ScheduleCountry, now: Date) {
  return (
    banner.is_enabled &&
    targetsCountry(banner, country.id) &&
    isWithinSchedule(banner, now, resolveCountryTimeZone(country))
  );
}

/** Higher priority first, then the most recent start, then the newest banner. */
export function compareBannerPrecedence(a: SchedulableBanner, b: SchedulableBanner) {
  if (a.priority !== b.priority) return b.priority - a.priority;
  const aStart = normalizeWallClock(a.starts_at) ?? "";
  const bStart = normalizeWallClock(b.starts_at) ?? "";
  if (aStart !== bStart) return aStart < bStart ? 1 : -1;
  const aCreated = a.created_at ?? "";
  const bCreated = b.created_at ?? "";
  if (aCreated !== bCreated) return aCreated < bCreated ? 1 : -1;
  return 0;
}

/** The single banner the storefront should show for `country` right now, if any. */
export function pickActiveBanner<T extends SchedulableBanner>(
  banners: T[],
  country: ScheduleCountry,
  now: Date,
): T | null {
  return [...banners]
    .filter((banner) => isBannerLive(banner, country, now))
    .sort(compareBannerPrecedence)[0] ?? null;
}

export type BannerStatus =
  | { kind: "disabled" }
  | { kind: "live"; countryIds: string[] }
  | { kind: "scheduled" }
  | { kind: "expired" }
  | { kind: "no-countries" };

/** Admin-facing status across every country the banner targets. */
export function getBannerStatus(
  banner: SchedulableBanner,
  countries: ScheduleCountry[],
  now: Date,
): BannerStatus {
  if (!banner.is_enabled) return { kind: "disabled" };

  const targets = countries.filter((country) => targetsCountry(banner, country.id));
  if (targets.length === 0) return { kind: "no-countries" };

  const liveIds = targets
    .filter((country) => isWithinSchedule(banner, now, resolveCountryTimeZone(country)))
    .map((country) => country.id);
  if (liveIds.length > 0) return { kind: "live", countryIds: liveIds };

  const start = normalizeWallClock(banner.starts_at);
  const upcoming = targets.some(
    (country) => start !== null && wallClockIn(now, resolveCountryTimeZone(country)) < start,
  );
  return upcoming ? { kind: "scheduled" } : { kind: "expired" };
}

/** True when two banners share a country and their wall-clock windows intersect. */
export function bannersOverlap(a: SchedulableBanner, b: SchedulableBanner) {
  if (a.id === b.id || !a.is_enabled || !b.is_enabled) return false;

  const sharesCountry =
    a.all_countries ||
    b.all_countries ||
    a.country_ids.some((countryId) => b.country_ids.includes(countryId));
  if (!sharesCountry) return false;

  const aStart = normalizeWallClock(a.starts_at);
  const aEnd = normalizeWallClock(a.ends_at);
  const bStart = normalizeWallClock(b.starts_at);
  const bEnd = normalizeWallClock(b.ends_at);

  const aStartsBeforeBEnds = aStart === null || bEnd === null || aStart < bEnd;
  const bStartsBeforeAEnds = bStart === null || aEnd === null || bStart < aEnd;
  return aStartsBeforeBEnds && bStartsBeforeAEnds;
}
