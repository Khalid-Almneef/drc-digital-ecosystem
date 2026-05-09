import { Resend } from "resend";

interface SendArgs {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

const apiKey = process.env.RESEND_API_KEY;
const from = process.env.EMAIL_FROM ?? "DRC <no-reply@drc.local>";
const client = apiKey ? new Resend(apiKey) : null;

export async function sendEmail({ to, subject, html, text }: SendArgs): Promise<void> {
  if (!client) {
    if (process.env.NODE_ENV !== "production") {
      console.log("[email:stub]", { to, subject, text: text ?? html });
    }
    return;
  }
  await client.emails.send({ from, to, subject, html, text });
}
