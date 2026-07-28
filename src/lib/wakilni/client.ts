import "server-only";

import { request as httpsRequest } from "node:https";

import { createAdminClient } from "@/lib/supabase/admin";

type JsonObject = Record<string, unknown>;

export type WakilniCountryConfig = {
  enabled?: boolean;
  baseUrl: string;
  key: string;
  secret: string;
  webhookSecret?: string;
  pickupLocationId: number;
  pickupLongitude: number;
  pickupLatitude: number;
  pickupFloor?: number;
  pickupArea: string;
  currencyId: number;
  cashCollectionTypeId?: number;
  packageTypeId?: number;
  defaultReceiverGender?: number;
  express?: boolean;
};

export class WakilniError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly response?: unknown,
  ) {
    super(message);
    this.name = "WakilniError";
  }
}

type RpcClient = {
  rpc: (name: string, args?: Record<string, unknown>) => Promise<{
    data: unknown;
    error: { message: string } | null;
  }>;
};

export async function getWakilniCountryConfig(countryCode: string) {
  const supabase = createAdminClient() as unknown as RpcClient;
  const { data, error } = await supabase.rpc("get_wakilni_country_config", {
    p_country_code: countryCode,
  });
  if (error) throw new WakilniError(`Could not load Wakilni settings: ${error.message}`);
  const account = data as WakilniCountryConfig | null;
  if (!account?.enabled) return null;
  if (!account.baseUrl || !account.key || !account.secret) {
    throw new WakilniError(`Wakilni credentials or baseUrl are missing for ${countryCode}.`);
  }
  const requiredNumbers: Array<[string, unknown]> = [
    ["pickupLocationId", account.pickupLocationId],
    ["pickupLongitude", account.pickupLongitude],
    ["pickupLatitude", account.pickupLatitude],
    ["currencyId", account.currencyId],
  ];
  const invalid = requiredNumbers.find(([, value]) => !Number.isFinite(Number(value)));
  if (invalid) {
    throw new WakilniError(`Wakilni ${invalid[0]} is invalid for ${countryCode}.`);
  }
  return { ...account, baseUrl: account.baseUrl.replace(/\/$/, "") };
}

export async function getWakilniWebhookSecrets() {
  const supabase = createAdminClient() as unknown as RpcClient;
  const { data, error } = await supabase.rpc("get_wakilni_webhook_configs");
  if (error) throw new WakilniError(`Could not load Wakilni webhook settings: ${error.message}`);
  return ((data ?? []) as Array<{ countryCode: string; webhookSecret?: string | null }>)
    .filter((account) => Boolean(account.webhookSecret))
    .map((account) => ({ countryCode: account.countryCode, secret: account.webhookSecret as string }));
}

async function parseResponse(response: Response) {
  const text = await response.text();
  let payload: unknown = text;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    // Preserve non-JSON error responses for the integration log.
  }
  if (!response.ok) {
    throw new WakilniError(`Wakilni returned HTTP ${response.status}.`, response.status, payload);
  }
  return payload as JsonObject;
}

// Wakilni documents authentication as GET with a JSON body. fetch() rejects GET
// bodies, so use the Node HTTPS client for this one endpoint.
async function authenticateWithGet(url: string, body: JsonObject) {
  const encoded = JSON.stringify(body);
  return new Promise<JsonObject>((resolve, reject) => {
    const target = new URL(url);
    const request = httpsRequest(
      target,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(encoded),
        },
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        response.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          let payload: unknown = text;
          try {
            payload = text ? JSON.parse(text) : null;
          } catch {
            // Handled below as an API error when necessary.
          }
          const status = response.statusCode ?? 500;
          if (status < 200 || status >= 300) {
            reject(new WakilniError(`Wakilni authentication returned HTTP ${status}.`, status, payload));
            return;
          }
          resolve(payload as JsonObject);
        });
      },
    );
    request.on("error", reject);
    request.setTimeout(15_000, () => request.destroy(new Error("Wakilni authentication timed out.")));
    request.write(encoded);
    request.end();
  });
}

export async function getWakilniToken(account: WakilniCountryConfig) {
  const payload = await authenticateWithGet(`${account.baseUrl}/api/v2/third_party/auth_token`, {
    key: account.key,
    secret: account.secret,
  });
  const token = payload.token;
  if (typeof token !== "string" || !token) {
    throw new WakilniError("Wakilni authentication did not return a token.", undefined, payload);
  }
  return token;
}

export async function wakilniRequest(
  account: WakilniCountryConfig,
  path: string,
  options: { method?: "GET" | "POST" | "PUT"; body?: JsonObject; token: string },
) {
  const response = await fetch(`${account.baseUrl}${path}`, {
    method: options.method ?? "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${options.token}`,
      "Content-Type": "application/json",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  return parseResponse(response);
}
