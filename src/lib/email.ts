import { Resend } from "resend";

interface SendArgs {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

const apiKey = process.env.RESEND_API_KEY;
// Resend rejects sends from unverified domains. Default to Resend's
// always-verified test sender ("onboarding@resend.dev") so the email
// flow works on day one. Override EMAIL_FROM with a verified custom
// domain (e.g. "DRC <no-reply@drc.club>") once DNS is set up in Resend.
const from = process.env.EMAIL_FROM ?? "DRC <onboarding@resend.dev>";
const client = apiKey ? new Resend(apiKey) : null;

export async function sendEmail({ to, subject, html, text }: SendArgs): Promise<void> {
  if (!client) {
    if (process.env.NODE_ENV !== "production") {
      console.log("[email:stub]", { to, subject, text: text ?? html });
    } else {
      console.warn("[email] RESEND_API_KEY not set — skipping send to", to);
    }
    return;
  }
  const result = await client.emails.send({ from, to, subject, html, text });
  if (result.error) {
    // Resend returns { error } instead of throwing on auth/domain issues —
    // promote it to a real error so the caller can log it.
    throw new Error(`Resend send failed: ${result.error.name} — ${result.error.message}`);
  }
}
