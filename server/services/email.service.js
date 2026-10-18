import nodemailer from "nodemailer";

class EmailService {
  constructor() {
    this.transporter = null;
    this.initTransporter();
  }

  initTransporter() {
    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || "587", 10),
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    }
  }

  async sendVerificationEmail(email, rawToken) {
    const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5174";
    const verificationUrl = `${clientOrigin}/verify-email?token=${rawToken}`;
    const fromAddress = process.env.EMAIL_FROM || "noreply@tirumalaheritage.org";

    if (this.transporter) {
      await this.transporter.sendMail({
        from: fromAddress,
        to: email,
        subject: "Verify Your Local Heritage Trail Explorer Account",
        html: `
          <h2>Welcome to Local Heritage Trail Explorer for Tirumala!</h2>
          <p>Please verify your account by clicking the link below:</p>
          <p><a href="${verificationUrl}">${verificationUrl}</a></p>
          <p>This verification link will expire in 24 hours.</p>
        `,
      });
    } else {
      // In development / test without SMTP credentials, log formatted message
      if (process.env.NODE_ENV !== "production") {
        console.log(`\n========================================`);
        console.log(`[DEV EMAIL SERVICE] Verification Email Sent`);
        console.log(`To: ${email}`);
        console.log(`Verification URL: ${verificationUrl}`);
        console.log(`========================================\n`);
      }
    }
  }

  async sendPasswordResetEmail(email, rawToken) {
    const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5174";
    const resetUrl = `${clientOrigin}/reset-password?token=${rawToken}`;
    const fromAddress = process.env.EMAIL_FROM || "noreply@tirumalaheritage.org";

    if (this.transporter) {
      await this.transporter.sendMail({
        from: fromAddress,
        to: email,
        subject: "Reset Your Password - Local Heritage Trail Explorer",
        html: `
          <h2>Password Reset Request</h2>
          <p>You requested a password reset for your Local Heritage Trail Explorer account.</p>
          <p>Click the link below to set a new password:</p>
          <p><a href="${resetUrl}">${resetUrl}</a></p>
          <p>This reset link will expire in 1 hour.</p>
          <p>If you did not request this reset, please ignore this email.</p>
        `,
      });
    } else {
      if (process.env.NODE_ENV !== "production") {
        console.log(`\n========================================`);
        console.log(`[DEV EMAIL SERVICE] Password Reset Email Sent`);
        console.log(`To: ${email}`);
        console.log(`Reset URL: ${resetUrl}`);
        console.log(`========================================\n`);
      }
    }
  }
}

export const emailService = new EmailService();
export default emailService;
