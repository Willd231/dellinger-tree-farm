// Vercel serverless function: POST /api/contact
// Not connected yet. Until it is, it returns 503 and the page falls back to
// a prefilled email link, so no inquiry is silently lost.
//
// TODO (Zoho): once the API credentials are set in Vercel env vars,
// create a Lead/Contact in Zoho here. Never put keys in this file.
//   ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN, ZOHO_API_DOMAIN

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const { name, email, phone, reason, message, company_website } = req.body ?? {};

  // Honeypot filled in = bot. Pretend success.
  if (company_website) return res.status(200).json({ ok: true });

  if (!name || !email || !phone || !reason) {
    return res.status(400).json({ ok: false, error: "Missing required fields" });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ ok: false, error: "Invalid email" });
  }

  if (!process.env.ZOHO_REFRESH_TOKEN) {
    return res.status(503).json({ ok: false, error: "Form backend not configured yet" });
  }

  // --- Zoho integration goes here ---
  // 1. Exchange refresh token for an access token
  // 2. POST { name, email, phone, reason, message: message ?? "" } to the Zoho module
  return res.status(503).json({ ok: false, error: "Zoho integration not implemented yet" });
}
