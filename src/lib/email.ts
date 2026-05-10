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
  const logoUrl = `${siteUrl}/logo-email.png`;
  // Brand colors: teal #00d9ac (primary), navy #00249c (secondary).
  // Cream background and white card so the email reads in dark-mode email
  // clients without forced inversion. Brand-tinted accents (top ribbon,
  // CTA, link, footer divider) tie the design to drcksu.com.
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light only" />
    <meta name="supported-color-schemes" content="light" />
    <title>${escapeHtml(heading)}</title>
    <!--[if mso]>
    <style>body,table,td,a{font-family:Arial,Helvetica,sans-serif !important;}</style>
    <![endif]-->
  </head>
  <body style="margin:0;padding:0;background-color:#eef3fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0b1220;-webkit-font-smoothing:antialiased;">
    <span style="display:none !important;visibility:hidden;mso-hide:all;opacity:0;color:transparent;height:0;width:0;line-height:0;font-size:0;overflow:hidden;">${escapeHtml(preheader)}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#eef3fb" style="background-color:#eef3fb;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;">
            <!-- Logo row -->
            <tr>
              <td align="center" style="padding:0 0 20px 0;">
                <a href="${escapeAttr(siteUrl)}" style="text-decoration:none;color:#00249c;">
                  <img src="${escapeAttr(logoUrl)}" alt="Drones &amp; Robotics Club — نادي الدرونز والروبوت" width="300" style="display:block;width:300px;max-width:80%;height:auto;border:0;outline:none;text-decoration:none;" />
                </a>
              </td>
            </tr>
            <!-- Card -->
            <tr>
              <td style="background-color:#ffffff;border-radius:16px;border:1px solid #d8def0;overflow:hidden;box-shadow:0 4px 12px rgba(0,36,156,0.06);">
                <!-- Brand teal ribbon -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td height="6" bgcolor="#00d9ac" style="height:6px;line-height:6px;font-size:6px;background-color:#00d9ac;">&nbsp;</td>
                  </tr>
                </table>
                <!-- Body padding -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="padding:36px 36px 32px 36px;">
                      <h1 style="margin:0 0 14px 0;font-size:24px;line-height:1.25;font-weight:700;color:#00249c;letter-spacing:-0.01em;">${escapeHtml(heading)}</h1>
                      <p style="margin:0 0 28px 0;font-size:15px;line-height:1.65;color:#3a4357;">${escapeHtml(intro)}</p>
                      <!-- CTA: brand navy with white text (AAA contrast, on-brand) -->
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td align="center" bgcolor="#00249c" style="border-radius:10px;background-color:#00249c;mso-padding-alt:0;">
                            <a href="${escapeAttr(ctaUrl)}" style="display:inline-block;padding:14px 30px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;border:1px solid #00249c;">${escapeHtml(ctaLabel)}</a>
                          </td>
                        </tr>
                      </table>
                      <p style="margin:28px 0 6px 0;font-size:13px;line-height:1.5;color:#6b7280;">
                        Or copy this link into your browser:
                      </p>
                      <p style="margin:0;font-size:12px;line-height:1.5;color:#00249c;word-break:break-all;font-family:ui-monospace,'SFMono-Regular',Menlo,Monaco,Consolas,monospace;">
                        <a href="${escapeAttr(ctaUrl)}" style="color:#00249c;text-decoration:underline;">${escapeHtml(ctaUrl)}</a>
                      </p>
                      ${footerNote ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;border-top:1px solid #e6e9f4;"><tr><td style="padding-top:20px;font-size:13px;line-height:1.6;color:#6b7280;">${escapeHtml(footerNote)}</td></tr></table>` : ""}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td align="center" style="padding:24px 8px 8px 8px;font-size:12px;line-height:1.6;color:#7c8499;">
                Drones &amp; Robotics Club · King Saud University<br />
                <a href="${escapeAttr(siteUrl)}" style="color:#00249c;text-decoration:none;font-weight:500;">drcksu.com</a> · &copy; ${year}
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
