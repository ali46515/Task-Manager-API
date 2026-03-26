import sgMail from "@sendgrid/mail";
import { config } from "dotenv";
config();
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

class EmailService {
  constructor() {
    this.fromEmail = process.env.EMAIL_FROM;
    this.frontendUrl = process.env.URL;
  }

  async sendPasswordResetEmail(email, resetToken, userName = "User") {
    const resetUrl = `${this.frontendUrl}/reset-password/${resetToken}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Reset Your Password</h2>
        <p>Hello ${userName},</p>
        <p>We received a request to reset your password. Click the button below to create a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="display: inline-block; padding: 12px 30px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">
            Reset Password
          </a>
        </div>
        <p>Or copy this link: <a href="${resetUrl}">${resetUrl}</a></p>
        <p>This link will expire in 10 minutes.</p>
        <hr style="margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">If you didn't request this, please ignore this email.</p>
      </div>
    `;

    const msg = {
      to: email,
      from: this.fromEmail,
      subject: "Password Reset Request",
      html: html,
      text: `Reset your password by visiting: ${resetUrl}\n\nThis link expires in 10 minutes.`,
    };

    await sgMail.send(msg);
  }

  async sendInvitationEmail(email, inviterName, organizationName, role) {
    const dashboardUrl = `${this.frontendUrl}/dashboard`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">You've Been Invited!</h2>
        <p>Hello,</p>
        <p><strong>${inviterName}</strong> has added you to <strong>${organizationName}</strong> as a <strong>${role}</strong>.</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Organization:</strong> ${organizationName}</p>
          <p style="margin: 5px 0 0 0;"><strong>Role:</strong> ${role}</p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${dashboardUrl}" style="display: inline-block; padding: 12px 30px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px;">
            Go to Dashboard
          </a>
        </div>
        <p>You can now access the organization's dashboard and collaborate with your team.</p>
        <hr style="margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">If you have any questions, please contact your organization administrator.</p>
      </div>
    `;

    const msg = {
      to: email,
      from: this.fromEmail,
      subject: `Invitation to join ${organizationName}`,
      html: html,
      text: `${inviterName} has added you to ${organizationName} as ${role}. Login to your dashboard to get started.`,
    };

    await sgMail.send(msg);
  }
}

export default new EmailService();
