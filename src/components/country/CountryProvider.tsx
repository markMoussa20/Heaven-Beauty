"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import {
  COUNTRY_COOKIE_KEY,
  COUNTRY_STORAGE_KEY,
  getDefaultCountryCode,
} from "@/lib/country/constants";
import type { Country } from "@/types/database";

type CountryContextValue = {
  countries: Country[];
  selectedCountry: Country | null;
  selectedCountryCode: string;
  setSelectedCountryCode: (code: string) => void;
};

const CountryContext = createContext<CountryContextValue | null>(null);

type CountryProviderProps = {
  children: React.ReactNode;
  countries: Country[];
  initialCountryCode?: string;
};

export function CountryProvider({
  children,
  countries,
  initialCountryCode,
}: CountryProviderProps) {
  const fallbackCode = initialCountryCode || getDefaultCountryCode();
  const [selectedCountryCode, setCountryCode] = useState(() => {
    if (typeof window === "undefined") {
      return fallbackCode;
    }

    const storedCode =
      window.localStorage.getItem(COUNTRY_STORAGE_KEY) || readCountryCookie();

    if (storedCode) {
      return storedCode;
    }

    persistCountryCode(fallbackCode);
    return fallbackCode;
  });

  const setSelectedCountryCode = useCallback((code: string) => {
    setCountryCode(code);
    persistCountryCode(code);
    window.location.reload();
  }, []);

  const selectedCountry = useMemo(() => {
    return (
      countries.find((country) => country.code === selectedCountryCode) ??
      countries.find((country) => country.code === fallbackCode) ??
      countries[0] ??
      null
    );
  }, [countries, fallbackCode, selectedCountryCode]);

  const value = useMemo(
    () => ({
      countries,
      selectedCountry,
      selectedCountryCode: selectedCountry?.code ?? selectedCountryCode,
      setSelectedCountryCode,
    }),
    [countries, selectedCountry, selectedCountryCode, setSelectedCountryCode],
  );

  return (
    <CountryContext.Provider value={value}>{children}</CountryContext.Provider>
  );
}

export function useCountry() {
  const context = useContext(CountryContext);

  if (!context) {
    throw new Error("useCountry must be used inside CountryProvider.");
  }

  return context;
}

function persistCountryCode(code: string) {
  window.localStorage.setItem(COUNTRY_STORAGE_KEY, code);
  document.cookie = `${COUNTRY_COOKIE_KEY}=${code}; path=/; max-age=31536000; SameSite=Lax`;
}

function readCountryCookie() {
  return document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(`${COUNTRY_COOKIE_KEY}=`))
    ?.split("=")[1];
}
