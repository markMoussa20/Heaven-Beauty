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
    <label className="inline-flex items-center gap-2 text-sm font-medium text-[#5f514c]">
      <span className="sr-only">Country</span>
      <select
        className={`${focusRing} h-10 rounded-full border border-[#eadbd4] bg-white px-4 text-sm font-semibold text-[#2b2523] shadow-sm hover:border-[#d7b9ad]`}
        value={selectedCountryCode}
        onChange={(event) => setSelectedCountryCode(event.target.value)}
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
