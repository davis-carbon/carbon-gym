import { Resend } from "resend";

const resendKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.EMAIL_FROM || "Carbon Training Centre <hello@carbontc.co>";

const resend = resendKey ? new Resend(resendKey) : null;

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

/** Send an email via Resend. No-op if RESEND_API_KEY isn't configured. */
export async function sendEmail(opts: EmailOptions): Promise<{ sent: boolean; id?: string; error?: string }> {
  if (!resend) {
    console.log("[email] RESEND_API_KEY not set — skipping email:", opts.subject);
    return { sent: false, error: "Resend not configured" };
  }

  try {
    const result = await resend.emails.send({
      from: fromEmail,
      to: Array.isArray(opts.to) ? opts.to : [opts.to],
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    });

    if (result.error) {
      console.error("[email] Send failed:", result.error);
      return { sent: false, error: result.error.message };
    }

    return { sent: true, id: result.data?.id };
  } catch (err: any) {
    console.error("[email] Exception:", err);
    return { sent: false, error: err.message };
  }
}

// ── Email templates ──────────────────────

export async function sendWelcomeEmail(client: { firstName: string; email: string }) {
  return sendEmail({
    to: client.email,
    subject: `Welcome to Carbon Training Centre, ${client.firstName}!`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
        <h1 style="color: #1C1917;">Welcome, ${client.firstName}!</h1>
        <p>We're thrilled to have you as part of the Carbon Training Centre community.</p>
        <p>You can log into your client portal at <a href="${process.env.NEXT_PUBLIC_APP_URL}/c">your dashboard</a> to:</p>
        <ul>
          <li>View your workouts</li>
          <li>Book sessions with your trainer</li>
          <li>Track your progress</li>
          <li>Message your trainer directly</li>
        </ul>
        <p>If you have any questions, just reply to this email or message your trainer in the app.</p>
        <p>— The Carbon Training Centre team</p>
      </div>
    `,
  });
}

export async function sendAppointmentReminderEmail(opts: {
  to: string;
  clientFirstName: string;
  serviceName: string;
  staffName: string;
  scheduledAt: Date;
}) {
  const when = opts.scheduledAt.toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return sendEmail({
    to: opts.to,
    subject: `Reminder: ${opts.serviceName} tomorrow at Carbon`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #1C1917;">Hi ${opts.clientFirstName},</h2>
        <p>This is a reminder about your upcoming session:</p>
        <div style="background: #F5F5F4; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0 0 8px;"><strong>${opts.serviceName}</strong></p>
          <p style="margin: 0 0 4px;">With ${opts.staffName}</p>
          <p style="margin: 0; color: #78716C;">${when}</p>
        </div>
        <p>If you need to reschedule, please do so at least 24 hours in advance. See you soon!</p>
      </div>
    `,
  });
}

export async function sendPaymentFailedEmail(opts: {
  to: string;
  clientFirstName: string;
  amount: number;
}) {
  return sendEmail({
    to: opts.to,
    subject: `Payment failed — Carbon Training Centre`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #B52714;">Payment failed</h2>
        <p>Hi ${opts.clientFirstName},</p>
        <p>We were unable to process your payment of $${opts.amount.toFixed(2)}.</p>
        <p>Please update your payment method at <a href="${process.env.NEXT_PUBLIC_APP_URL}/c/profile">your profile</a> to avoid any interruption.</p>
      </div>
    `,
  });
}
