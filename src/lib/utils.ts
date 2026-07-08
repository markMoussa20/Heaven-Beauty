import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function asNumber(value: FormDataEntryValue | null) {
  if (value === null || value === "") {
    return null;
  }

  return Number(value);
}

export function asBoolean(value: FormDataEntryValue | null) {
  return value === "on" || value === "true";
}
