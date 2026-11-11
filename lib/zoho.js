// Zoho Invoice client: server-side only. Never import this from browser code.
// READ ONLY: this module only issues GET requests to the Zoho API.
//
// Token cache lives in module scope. Serverless cold starts lose it, which is
// fine at our traffic level. If refresh throttling ever becomes a problem,
// swap getCachedToken/setCachedToken for a shared store (e.g. Vercel KV).

const REFRESH_MARGIN_MS = 5 * 60 * 1000;

let cached = null;    // { token, expiresAt }
let inFlight = null;  // Promise<string> while a refresh is running

export class ZohoError extends Error {
  constructor(message, { status = 500, code = "zoho_error", retryAfter } = {}) {
    super(message);
    this.name = "ZohoError";
    this.status = status;
    this.code = code;
    if (retryAfter) this.retryAfter = retryAfter;
  }
}

function env(name, { required = true } = {}) {
  const v = process.env[name];
  if (required && !v) throw new ZohoError(`Missing env var ${name}`, { code: "config" });
  return v;
}

async function refreshAccessToken() {
  const body = new URLSearchParams({
    refresh_token: env("ZOHO_REFRESH_TOKEN"),
    client_id: env("ZOHO_CLIENT_ID"),
    client_secret: env("ZOHO_CLIENT_SECRET"),
    grant_type: "refresh_token",
  });
  const res = await fetch(`${env("ZOHO_ACCOUNTS_URL")}/oauth/v2/token`, { method: "POST", body });
  const data = await res.json().catch(() => ({}));

  // Zoho returns 200 with { error } on bad credentials. Only surface the error code.
  if (!res.ok || data.error || !data.access_token) {
    const code = typeof data.error === "string" ? data.error : `http_${res.status}`;
    throw new ZohoError(`Zoho token refresh failed: ${code}`, { status: 502, code });
  }
  cached = {
    token: data.access_token,
    expiresAt: Date.now() + (Number(data.expires_in) || 3600) * 1000,
  };
  return cached.token;
}

async function getAccessToken({ force = false } = {}) {
  if (!force && cached && cached.expiresAt - Date.now() > REFRESH_MARGIN_MS) return cached.token;
  if (!inFlight) {
    inFlight = refreshAccessToken().finally(() => { inFlight = null; });
  }
  return inFlight;
}

/**
 * GET a Zoho Invoice endpoint.
 * @param {string} path   e.g. "/invoices"
 * @param {Record<string, string|number|undefined>} [params]
 * @param {{ org?: boolean }} [opts]  org:false skips the org header (for /organizations)
 */
export async function zohoGet(path, params = {}, { org = true } = {}) {
  const url = new URL(env("ZOHO_API_BASE") + path);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }

  const send = async (token) => {
    const headers = { Authorization: `Zoho-oauthtoken ${token}` };
    if (org) headers["X-com-zoho-invoice-organizationid"] = env("ZOHO_ORG_ID");
    return fetch(url, { method: "GET", headers });
  };

  let res = await send(await getAccessToken());
  if (res.status === 401) {
    res = await send(await getAccessToken({ force: true }));
  }

  if (res.status === 429) {
    const retryAfter = Number(res.headers.get("retry-after")) || 60;
    throw new ZohoError("Zoho rate limit reached", { status: 429, code: "rate_limited", retryAfter });
  }

  const data = await res.json().catch(() => ({}));
  // Zoho Invoice responses carry { code: 0 } on success.
  if (!res.ok || (typeof data.code === "number" && data.code !== 0)) {
    throw new ZohoError(`Zoho request failed: ${data.message ?? res.status}`, {
      status: res.status >= 400 ? res.status : 502,
      code: `zoho_${data.code ?? res.status}`,
    });
  }
  return data;
}

/** Follow page_context.has_more_page and collect every row under `key`. */
export async function zohoGetAll(path, key, params = {}, { maxPages = 10 } = {}) {
  const rows = [];
  for (let page = 1; page <= maxPages; page++) {
    const data = await zohoGet(path, { ...params, page, per_page: 200 });
    rows.push(...(data[key] ?? []));
    if (!data.page_context?.has_more_page) break;
  }
  return rows;
}
