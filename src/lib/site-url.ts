import "server-only";

export function getSiteUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configuredUrl) return configuredUrl.replace(/\/+$/, "");

  const productionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (productionUrl) return `https://${productionUrl.replace(/^https?:\/\//, "").replace(/\/+$/, "")}`;

  const deploymentUrl = process.env.VERCEL_URL?.trim();
  if (deploymentUrl) return `https://${deploymentUrl.replace(/^https?:\/\//, "").replace(/\/+$/, "")}`;

  return "http://localhost:3000";
}

export function getOrderTrackingUrl(token?: string | null) {
  const path = token ? `/track-order/${encodeURIComponent(token)}` : "/track-order";
  return `${getSiteUrl()}${path}`;
}

