import { Resend } from "resend";
import { render } from "@react-email/render";
import TwoFactorOTPEmail from "./templates/two-factor-otp";

const resend = new Resend(process.env.RESEND_API_KEY || "re_development_key");

interface EmailParams {
  to: string;
  subject: string;
  html: string;
}

async function sendEmail({ to, subject, html }: EmailParams): Promise<void> {
  if (process.env.NODE_ENV === "development") {
    console.log("=".repeat(80));
    console.log("📧 EMAIL (Development Mode - Not Sent)");
    console.log("=".repeat(80));
    console.log("To:", to);
    console.log("From:", process.env.EMAIL_FROM || "noreply@yourdomain.com");
    console.log("Subject:", subject);
    console.log("-".repeat(80));
    console.log("HTML Content:");
    console.log(html);
    console.log("=".repeat(80));
    return;
  }

  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM || "noreply@yourdomain.com",
      to,
      subject,
      html,
    });
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Failed to send email");
  }
}

export async function sendVerificationEmail(
  email: string,
  verificationUrl: string
): Promise<void> {
  // Detect email type based on URL pattern
  const isEmailChange = verificationUrl.includes("/change-email");
  const isAccountDeletion = verificationUrl.includes("/delete-account");
  // const isEmailVerification = !isEmailChange && !isAccountDeletion;

  let subject: string;
  let heading: string;
  let message: string;
  let buttonText: string;
  let buttonColor: string;
  let warningMessage: string;

  if (isAccountDeletion) {
    subject = "⚠️ Confirm Account Deletion - EduSmart";
    heading = "Confirm Account Deletion";
    message =
      "You requested to delete your EduSmart account. This action is permanent and cannot be undone. All your data, including profile information, progress, and settings will be permanently removed.";
    buttonText = "Delete My Account";
    buttonColor = "#e74c3c"; // Red
    warningMessage =
      "If you did not request this deletion, please ignore this email and secure your account immediately.";
  } else if (isEmailChange) {
    subject = "✉️ Confirm Email Change - EduSmart";
    heading = "Confirm Email Address Change";
    message =
      "You requested to change your email address. Click the button below to confirm this change and verify your new email address.";
    buttonText = "Confirm Email Change";
    buttonColor = "#3498db"; // Blue
    warningMessage =
      "If you did not request this change, please ignore this email and secure your account.";
  } else {
    subject = "✅ Verify Your Email Address - EduSmart";
    heading = "Verify Your Email Address";
    message =
      "Thank you for registering with EduSmart. To complete your registration and start accessing our platform, please verify your email address by clicking the button below:";
    buttonText = "Verify Email Address";
    buttonColor = "#27ae60"; // Green
    warningMessage =
      "If you didn't create an account with EduSmart, please ignore this email.";
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${heading}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f4f4f4; padding: 20px; border-radius: 10px;">
          <h1 style="color: #2c3e50; text-align: center;">${isAccountDeletion ? "⚠️ " : ""}${heading}</h1>
          
          <div style="background-color: white; padding: 30px; border-radius: 5px; margin-top: 20px;">
            ${
              isAccountDeletion
                ? `
              <div style="background-color: #fee; border-left: 4px solid #e74c3c; padding: 15px; margin-bottom: 20px;">
                <strong style="color: #e74c3c;">Warning: This action is permanent and irreversible!</strong>
              </div>
            `
                : ""
            }
            
            <h2 style="color: ${buttonColor};">${heading}</h2>
            
            <p>${message}</p>
            
            ${
              isAccountDeletion
                ? `
              <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; color: #856404;"><strong>What will be deleted:</strong></p>
                <ul style="margin: 10px 0; color: #856404;">
                  <li>Your profile and personal information</li>
                  <li>All your learning progress and data</li>
                  <li>Linked social accounts</li>
                  <li>All active sessions</li>
                </ul>
              </div>
            `
                : ""
            }
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" 
                 style="background-color: ${buttonColor}; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                ${buttonText}
              </a>
            </div>
            
            <p style="color: #7f8c8d; font-size: 14px;">
              If the button doesn't work, copy and paste this link into your browser:
            </p>
            <p style="word-break: break-all; color: #3498db; font-size: 12px;">
              ${verificationUrl}
            </p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="color: #95a5a6; font-size: 12px;">
              ${warningMessage}
            </p>
            
            <p style="color: #95a5a6; font-size: 12px;">
              This link will expire in ${isAccountDeletion ? "24 hours" : "24 hours"}.
            </p>
          </div>
          
          <p style="text-align: center; color: #95a5a6; font-size: 12px; margin-top: 20px;">
            &copy; ${new Date().getFullYear()} EduSmart. All rights reserved.
          </p>
        </div>
      </body>
    </html>
  `;

  // Enhanced development logging
  if (process.env.NODE_ENV === "development") {
    console.log("=".repeat(80));
    console.log(`📧 EMAIL (Development Mode - Not Sent)`);
    console.log("=".repeat(80));
    console.log(
      "Type:",
      isAccountDeletion
        ? "🗑️  ACCOUNT DELETION"
        : isEmailChange
          ? "✉️  EMAIL CHANGE"
          : "✅ EMAIL VERIFICATION"
    );
    console.log("To:", email);
    console.log("From:", process.env.EMAIL_FROM || "noreply@yourdomain.com");
    console.log("Subject:", subject);
    console.log("-".repeat(80));
    console.log("Verification URL:");
    console.log(verificationUrl);
    console.log("-".repeat(80));
    console.log("HTML Content:");
    console.log(html);
    console.log("=".repeat(80));
    return;
  }

  await sendEmail({
    to: email,
    subject,
    html,
  });
}
export async function sendPasswordResetEmail(
  email: string,
  resetUrl: string
): Promise<void> {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f4f4f4; padding: 20px; border-radius: 10px;">
          <h1 style="color: #2c3e50; text-align: center;">Password Reset Request</h1>
          
          <div style="background-color: white; padding: 30px; border-radius: 5px; margin-top: 20px;">
            <h2 style="color: #e74c3c;">Reset Your Password</h2>
            
            <p>We received a request to reset the password for your EduSmart account. Click the button below to create a new password:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background-color: #e74c3c; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Reset Password
              </a>
            </div>
            
            <p style="color: #7f8c8d; font-size: 14px;">
              If the button doesn't work, copy and paste this link into your browser:
            </p>
            <p style="word-break: break-all; color: #3498db; font-size: 12px;">
              ${resetUrl}
            </p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="color: #95a5a6; font-size: 12px;">
              If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
            </p>
            
            <p style="color: #95a5a6; font-size: 12px;">
              This reset link will expire in 1 hour for security reasons.
            </p>
          </div>
          
          <p style="text-align: center; color: #95a5a6; font-size: 12px; margin-top: 20px;">
            &copy; ${new Date().getFullYear()} EduSmart. All rights reserved.
          </p>
        </div>
      </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject: "Reset Your Password - EduSmart",
    html,
  });
}

/**
 * Send two-factor authentication OTP via email
 *
 * @param email - User's email address
 * @param otp - One-time password code
 * @param userName - Optional user name for personalization
 */
export async function sendTwoFactorOTP(
  email: string,
  otp: string,
  userName?: string
): Promise<void> {
  const html = await render(
    TwoFactorOTPEmail({
      otp,
      userName,
      expiresInMinutes: 3,
    })
  );

  await sendEmail({
    to: email,
    subject: "Two-Factor Authentication Code - EduSmart",
    html,
  });
}
