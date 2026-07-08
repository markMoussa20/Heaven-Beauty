"use client";

import { useCountry } from "@/components/country/CountryProvider";
import { focusRing } from "@/lib/design";

export function CountrySelector() {
  const { countries, selectedCountryCode, setSelectedCountryCode } =
    useCountry();

  if (countries.length === 0) {
    return null;
  }

  return (
    <label className="inline-flex items-center gap-2 text-sm font-medium text-[#6c93c4]">
      <span className="sr-only">Country</span>
      <select
        className={`${focusRing} h-9 border border-[#6c93c4]/25 bg-white px-3 text-xs font-medium uppercase tracking-wide text-[#6c93c4] hover:border-[#6c93c4]`}
        onChange={(event) => setSelectedCountryCode(event.target.value)}
        suppressHydrationWarning
        value={selectedCountryCode}
      >
        {countries.map((country) => (
          <option key={country.id} value={country.code}>
            {country.name} ({country.currency_code})
          </option>
        ))}
      </select>
    </label>
  );
}
