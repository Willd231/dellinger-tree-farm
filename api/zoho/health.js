// GET /api/zoho/health: confirms Zoho credentials work. Returns only the org name.
import { zohoGet } from "../../lib/zoho.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false });
  }
  try {
    const data = await zohoGet("/organizations", {}, { org: false });
    const orgId = process.env.ZOHO_ORG_ID;
    const org = (data.organizations ?? []).find((o) => o.organization_id === orgId) ?? data.organizations?.[0];
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    return res.status(200).json({ ok: true, orgName: org?.name ?? null });
  } catch (err) {
    return res.status(err.status ?? 500).json({ ok: false, error: err.code ?? "error" });
  }
}
