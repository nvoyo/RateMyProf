import nodemailer from 'nodemailer'
import { env } from '../../env.ts'

/**
 * Mail service backed by nodemailer + real SMTP.
 * Credentials come from the environment (see .env.example).
 */
class MailService {
  private transporter: nodemailer.Transporter | null = null

  private getTransporter() {
    if (this.transporter) return this.transporter

    if (!env.smtp.host) {
      // SMTP not configured yet — log instead of failing hard so the
      // rest of the app (setup, login) keeps working in local dev.
      return null
    }

    this.transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      auth:
        env.smtp.user || env.smtp.pass
          ? { user: env.smtp.user, pass: env.smtp.pass }
          : undefined,
    })

    return this.transporter
  }

  async send(options: { to: string; subject: string; html: string; text?: string }) {
    const transporter = this.getTransporter()

    if (!transporter) {
      console.warn(
        `[mail] SMTP not configured. Would have sent "${options.subject}" to ${options.to}`,
      )
      console.warn(`[mail] Body:\n${options.text ?? options.html}`)
      return { delivered: false as const }
    }

    try {
      await transporter.sendMail({
        from: env.smtp.from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      })
      return { delivered: true as const }
    } catch (error) {
      // Don't fail the whole request if email delivery fails — the invite
      // (or other action) has already been persisted. Surface the link in
      // logs so it can be shared manually during development.
      console.error('[mail] Failed to send email:', error)
      console.warn(
        `[mail] Undelivered "${options.subject}" to ${options.to}:\n${options.text ?? options.html}`,
      )
      return { delivered: false as const }
    }
  }

  /**
   * Sends a whitelist invite email containing the registration link.
   */
  async sendInvite(options: { to: string; schoolName: string; token: string }) {
    const link = `${env.webOrigin}/register?token=${encodeURIComponent(options.token)}`
    const subject = `You're invited to review professors at ${options.schoolName}`
    const text = [
      `Hi,`,
      ``,
      `You've been invited to join the ${options.schoolName} community on Rate My Professor.`,
      `Complete your registration here:`,
      link,
      ``,
      `This link will expire soon. If you weren't expecting this, you can ignore this email.`,
    ].join('\n')

    const html = `
      <div style="font-family: sans-serif; line-height: 1.6; color: #1f2937;">
        <h2>You're invited 🎓</h2>
        <p>You've been invited to join the <strong>${options.schoolName}</strong>
        community on Rate My Professor.</p>
        <p>
          <a href="${link}"
             style="display:inline-block;background:#4f46e5;color:#fff;
                    padding:10px 18px;border-radius:6px;text-decoration:none;">
            Complete registration
          </a>
        </p>
        <p style="color:#6b7280;font-size:13px;">
          Or copy this link: <br />${link}
        </p>
        <p style="color:#9ca3af;font-size:12px;">
          This link will expire soon. If you weren't expecting this, ignore this email.
        </p>
      </div>`

    return this.send({ to: options.to, subject, html, text })
  }

  /**
   * Sends a password reset email containing a reset link.
   */
  async sendPasswordReset(options: { to: string; token: string }) {
    const link = `${env.webOrigin}/reset-password?token=${encodeURIComponent(options.token)}`
    const subject = 'Reset your password'
    const text = [
      `Hi,`,
      ``,
      `You requested a password reset for your Rate My Professor account.`,
      `Click the link below to set a new password:`,
      link,
      ``,
      `This link will expire in 1 hour.`,
      `If you didn't request this, you can safely ignore this email.`,
    ].join('\n')

    const html = `
      <div style="font-family: sans-serif; line-height: 1.6; color: #1f2937;">
        <h2>Reset your password</h2>
        <p>You requested a password reset for your Rate My Professor account.</p>
        <p>
          <a href="${link}"
             style="display:inline-block;background:#4f46e5;color:#fff;
                    padding:10px 18px;border-radius:6px;text-decoration:none;">
            Set new password
          </a>
        </p>
        <p style="color:#6b7280;font-size:13px;">
          Or copy this link: <br />${link}
        </p>
        <p style="color:#9ca3af;font-size:12px;">
          This link expires in 1 hour. If you didn't request this, ignore this email.
        </p>
      </div>`

    return this.send({ to: options.to, subject, html, text })
  }
}

export const mail = new MailService()
