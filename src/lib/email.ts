import { Resend } from "resend";

interface SendArgs {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

const apiKey = process.env.RESEND_API_KEY;
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
    throw new Error(`Resend send failed: ${result.error.name} — ${result.error.message}`);
  }
}

interface TemplateArgs {
  siteUrl: string;
  preheader: string;
  heading: string;
  intro: string;
  ctaLabel: string;
  ctaUrl: string;
  footerNote?: string;
}

export function renderEmail({
  siteUrl,
  preheader,
  heading,
  intro,
  ctaLabel,
  ctaUrl,
  footerNote,
}: TemplateArgs): string {
  const year = new Date().getFullYear();
  // Single-column transactional template, light surface, brand teal accent.
  // Avoids dark backgrounds (clients invert them inconsistently) and external
  // images (logo blocked when remote images are off). Wordmark is rendered
  // as text inside a brand-tinted pill so it always shows.
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light only" />
    <meta name="supported-color-schemes" content="light" />
    <title>${escapeHtml(heading)}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827;">
    <span style="display:none !important;visibility:hidden;mso-hide:all;opacity:0;color:transparent;height:0;width:0;line-height:0;font-size:0;overflow:hidden;">${escapeHtml(preheader)}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f5f7;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;">
            <tr>
              <td style="padding:0 0 24px 0;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="background:#0f766e;border-radius:8px;padding:8px 14px;">
                      <span style="display:inline-block;font-size:14px;font-weight:700;letter-spacing:0.18em;color:#ffffff;">DRC</span>
                    </td>
                    <td style="padding-left:12px;font-size:13px;font-weight:600;color:#374151;">
                      Drones &amp; Robotics Club
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="background-color:#ffffff;border-radius:14px;border:1px solid #e5e7eb;padding:36px 36px 32px 36px;">
                <h1 style="margin:0 0 14px 0;font-size:24px;line-height:1.25;font-weight:700;color:#0b1220;letter-spacing:-0.01em;">${escapeHtml(heading)}</h1>
                <p style="margin:0 0 28px 0;font-size:15px;line-height:1.65;color:#4b5563;">${escapeHtml(intro)}</p>
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="center" style="border-radius:10px;background:#0f766e;mso-padding-alt:14px 28px;">
                      <a href="${escapeAttr(ctaUrl)}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">${escapeHtml(ctaLabel)}</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:28px 0 0 0;font-size:13px;line-height:1.6;color:#6b7280;">
                  Or copy this link into your browser:
                </p>
                <p style="margin:6px 0 0 0;font-size:12px;line-height:1.5;color:#0f766e;word-break:break-all;font-family:ui-monospace,'SFMono-Regular',Menlo,Monaco,Consolas,monospace;">
                  <a href="${escapeAttr(ctaUrl)}" style="color:#0f766e;text-decoration:none;">${escapeHtml(ctaUrl)}</a>
                </p>
                ${footerNote ? `<p style="margin:24px 0 0 0;padding-top:20px;border-top:1px solid #f3f4f6;font-size:13px;line-height:1.6;color:#6b7280;">${escapeHtml(footerNote)}</p>` : ""}
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:20px 8px;font-size:12px;line-height:1.5;color:#9ca3af;">
                Drones &amp; Robotics Club · King Saud University<br />
                <a href="${escapeAttr(siteUrl)}" style="color:#6b7280;text-decoration:none;">drcksu.com</a> · &copy; ${year}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}
