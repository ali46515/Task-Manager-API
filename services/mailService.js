import sgMail from "@sendgrid/mail";
import { config } from "dotenv";

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendPasswordResetEmail = async (email, resetToken) => {
  const resetUrl = `${process.env.URL}/reset-password/${resetToken}`;

  const msg = {
    to: email,
    from: process.env.EMAIL_FROM,
    subject: "Password Reset Request",
    html: `
      <h2>Password Reset Request</h2>
      <p>Click here to reset your password: <a href="${resetUrl}">${resetUrl}</a></p>
      <p>This link expires in 10 minutes.</p>
    `,
  };

  await sgMail.send(msg);
};
