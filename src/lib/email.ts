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
  const logoUrl = `${siteUrl}/logo-horizontal.png`;
  const year = new Date().getFullYear();
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(heading)}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#0b0d12;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#e6e9ef;">
    <span style="display:none;visibility:hidden;opacity:0;color:transparent;height:0;width:0;">${escapeHtml(preheader)}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0b0d12;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background-color:#11141b;border:1px solid #1f2430;border-radius:12px;overflow:hidden;">
            <tr>
              <td align="center" style="padding:32px 32px 16px 32px;border-bottom:1px solid #1f2430;">
                <a href="${escapeAttr(siteUrl)}" style="text-decoration:none;">
                  <img src="${escapeAttr(logoUrl)}" alt="DRC — Drones &amp; Robotics Club" width="180" style="display:block;height:auto;max-width:180px;" />
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 12px 0;font-size:22px;line-height:1.3;font-weight:600;color:#ffffff;">${escapeHtml(heading)}</h1>
                <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:#c2c8d2;">${escapeHtml(intro)}</p>
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="center" style="border-radius:8px;background:#3b82f6;">
                      <a href="${escapeAttr(ctaUrl)}" style="display:inline-block;padding:12px 24px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">${escapeHtml(ctaLabel)}</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:24px 0 0 0;font-size:13px;line-height:1.6;color:#8a92a3;">If the button doesn't work, copy this link into your browser:<br /><span style="color:#9aa3b5;word-break:break-all;">${escapeHtml(ctaUrl)}</span></p>
                ${footerNote ? `<p style="margin:24px 0 0 0;font-size:13px;line-height:1.6;color:#8a92a3;">${escapeHtml(footerNote)}</p>` : ""}
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:20px 32px;border-top:1px solid #1f2430;font-size:12px;color:#6b7383;">
                Drones &amp; Robotics Club · King Saud University<br />
                <a href="${escapeAttr(siteUrl)}" style="color:#8a92a3;text-decoration:none;">drcksu.com</a> · &copy; ${year}
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
