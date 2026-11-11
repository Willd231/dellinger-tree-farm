// Vercel serverless function: POST /api/contact
// Emails each inquiry to everyone in CONTACT_TO using Resend (https://resend.com, free tier).
// Until RESEND_API_KEY is set it returns 503 and the page falls back to a
// prefilled email link, so no inquiry is silently lost.
//
// Env vars (set in Vercel, never in this file):
//   RESEND_API_KEY  API key from Resend
//   CONTACT_TO      comma-separated recipient list
//   CONTACT_FROM    sender on your verified domain, e.g. "Dellinger Tree Farm <website@yourdomain.com>"

const clip = (v, n) => String(v ?? "").trim().slice(0, n);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const body = req.body ?? {};

  // Honeypot filled in = bot. Pretend success.
  if (body.company_website) return res.status(200).json({ ok: true });

  const name = clip(body.name, 120);
  const email = clip(body.email, 200);
  const phone = clip(body.phone, 40);
  const reason = clip(body.reason, 80);
  const message = clip(body.message, 5000);

  if (!name || !email || !phone || !reason) {
    return res.status(400).json({ ok: false, error: "Missing required fields" });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ ok: false, error: "Invalid email" });
  }

  const { RESEND_API_KEY, CONTACT_TO, CONTACT_FROM } = process.env;
  const to = (CONTACT_TO ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!RESEND_API_KEY || !CONTACT_FROM || !to.length) {
    return res.status(503).json({ ok: false, error: "Form backend not configured yet" });
  }

  const text = [
    `New inquiry from the website`,
    ``,
    `Name:   ${name}`,
    `Phone:  ${phone}`,
    `Email:  ${email}`,
    `Reason: ${reason}`,
    ``,
    message || "(no message)",
  ].join("\n");

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: CONTACT_FROM,
        to,
        reply_to: email,
        subject: `Website inquiry: ${reason} (${name})`,
        text,
      }),
    });
    if (!r.ok) {
      console.error("Resend send failed", r.status); // status only; never log keys or form data
      return res.status(502).json({ ok: false, error: "Email send failed" });
    }
    return res.status(200).json({ ok: true });
  } catch {
    return res.status(502).json({ ok: false, error: "Email send failed" });
  }
}
