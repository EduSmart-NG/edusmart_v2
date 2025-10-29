import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { render } from "@react-email/render";
import TwoFactorOTPEmail from "./templates/two-factor-otp";

interface EmailParams {
  to: string;
  subject: string;
  html: string;
}

// Create reusable transporter using Gmail
function createTransporter(): Transporter {
  const gmailUser = process.env.GMAIL_USER;
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

  if (!gmailUser || !gmailAppPassword) {
    throw new Error(
      "Gmail credentials not configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD environment variables."
    );
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: gmailUser,
      pass: gmailAppPassword,
    },
  });
}

async function sendEmail({ to, subject, html }: EmailParams): Promise<void> {
  // Enhanced logging for both dev and prod
  console.log("=".repeat(80));
  console.log(
    process.env.NODE_ENV === "development"
      ? "📧 EMAIL (Development Mode - Sending via Gmail)"
      : "📧 EMAIL (Production Mode - Sending via Gmail)"
  );
  console.log("=".repeat(80));
  console.log("To:", to);
  console.log("From:", process.env.GMAIL_USER);
  console.log("Subject:", subject);
  console.log("-".repeat(80));

  try {
    const transporter = createTransporter();

    const info = await transporter.sendMail({
      from: `"EduSmart" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
    });

    console.log("✅ Email sent successfully!");
    console.log("Message ID:", info.messageId);
    console.log("=".repeat(80));
  } catch (error) {
    console.error("❌ Error sending email:");
    console.error(error);
    console.log("=".repeat(80));
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

  let subject: string;
  let heading: string;
  let message: string;
  let buttonText: string;
  let buttonColor: string;
  let warningMessage: string;
  let icon: string;

  if (isAccountDeletion) {
    subject = "⚠️ Confirm Account Deletion - EduSmart";
    heading = "Confirm Account Deletion";
    message =
      "You requested to delete your EduSmart account. This action is permanent and cannot be undone. All your data, including profile information, progress, and settings will be permanently removed.";
    buttonText = "Delete My Account";
    buttonColor = "#e74c3c"; // Red
    warningMessage =
      "If you did not request this deletion, please ignore this email and secure your account immediately.";
    icon = "⚠️";
  } else if (isEmailChange) {
    subject = "✉️ Confirm Email Change - EduSmart";
    heading = "Confirm Email Address Change";
    message =
      "You requested to change your email address. Click the button below to confirm this change and verify your new email address.";
    buttonText = "Confirm Email Change";
    buttonColor = "#3498db"; // Blue
    warningMessage =
      "If you did not request this change, please ignore this email and secure your account.";
    icon = "✉️";
  } else {
    subject = "✅ Verify Your Email Address - EduSmart";
    heading = "Verify Your Email Address";
    message =
      "Thank you for registering with EduSmart. To complete your registration and start accessing our platform, please verify your email address by clicking the button below:";
    buttonText = "Verify Email Address";
    buttonColor = "#27ae60"; // Green
    warningMessage =
      "If you didn't create an account with EduSmart, please ignore this email.";
    icon = "✅";
  }

  const html = `
    <!DOCTYPE html>
    <html lang="en-US">
    <head>
      <meta content="text/html; charset=utf-8" http-equiv="Content-Type" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${heading} - EduSmart</title>
      <style type="text/css">
        @import ur[](https://fonts.googleapis.com/css?family=Rubik:300,400,500,700|Open+Sans:300,400,600,700);
        body { margin: 0px; background-color: #f2f3f8; font-family: 'Open Sans', sans-serif; }
        table { border-collapse: collapse; }
        a:hover { text-decoration: underline !important; }
        .button { text-decoration: none !important; font-weight: 500; color: #fff; text-transform: uppercase; font-size: 14px; padding: 10px 24px; display: inline-block; border-radius: 50px; }
        .warning-box { background-color: #fee; border-left: 4px solid #e74c3c; padding: 15px; margin: 20px 0; border-radius: 3px; }
        .info-box { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 3px; }
        ul { margin: 10px 0; padding-left: 20px; }
        @media only screen and (max-width: 600px) {
          .content { padding: 0 20px !important; }
          h1 { font-size: 24px !important; }
        }
      </style>
    </head>
    <body style="margin: 0px; background-color: #f2f3f8;">
      <!--100% body table-->
      <table cellspacing="0" border="0" cellpadding="0" width="100%" bgcolor="#f2f3f8">
        <tr>
          <td>
            <table style="background-color: #f2f3f8; max-width: 670px; margin: 0 auto;" width="100%" border="0" align="center" cellpadding="0" cellspacing="0">
              <tr>
                <td style="height: 80px;">&nbsp;</td>
              </tr>
              <tr>
                <td style="text-align: center;">
                  <a href="https://edusmart.com" title="EduSmart" target="_blank">
                    <img width="60" src="https://via.placeholder.com/60x60/2c3e50/ffffff?text=ES" title="EduSmart" alt="EduSmart" style="border-radius: 50%;">
                  </a>
                </td>
              </tr>
              <tr>
                <td style="height: 20px;">&nbsp;</td>
              </tr>
              <tr>
                <td>
                  <table width="95%" border="0" align="center" cellpadding="0" cellspacing="0" style="max-width: 670px; background: #fff; border-radius: 3px; text-align: center; -webkit-box-shadow: 0 6px 18px 0 rgba(0,0,0,.06); -moz-box-shadow: 0 6px 18px 0 rgba(0,0,0,.06); box-shadow: 0 6px 18px 0 rgba(0,0,0,.06);">
                    <tr>
                      <td style="height: 40px;">&nbsp;</td>
                    </tr>
                    <tr>
                      <td class="content" style="padding: 0 35px;">
                        <h1 style="color: #2c3e50; font-weight: 500; margin: 0; font-size: 32px; font-family: 'Rubik', sans-serif;">${icon} ${heading}</h1>
                        <span style="display: inline-block; vertical-align: middle; margin: 29px 0 26px; border-bottom: 1px solid #cecece; width: 100px;"></span>
                        <p style="color: #455056; font-size: 15px; line-height: 24px; margin: 0;">${message}</p>
                        
                        ${
                          isAccountDeletion
                            ? `
                          <div class="warning-box">
                            <strong style="color: #e74c3c;">Warning: This action is permanent and irreversible!</strong>
                          </div>
                          <div class="info-box">
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
                        
                        <p style="color: #7f8c8d; font-size: 14px; margin: 30px 0 0 0;">
                          If the button doesn't work, copy and paste this link into your browser:
                        </p>
                        <p style="word-break: break-all; color: #3498db; font-size: 12px; margin: 10px 0 0 0;">
                          ${verificationUrl}
                        </p>
                        
                        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                        
                        <p style="color: #95a5a6; font-size: 12px; margin: 0;">
                          ${warningMessage}
                        </p>
                        
                        <p style="color: #95a5a6; font-size: 12px; margin: 10px 0 0 0;">
                          This link will expire in 24 hours.
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td style="height: 40px;">&nbsp;</td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="height: 20px;">&nbsp;</td>
              </tr>
              <tr>
                <td style="text-align: center;">
                  <p style="font-size: 14px; color: rgba(69, 80, 86, 0.74); line-height: 18px; margin: 0;">&copy; ${new Date().getFullYear()} EduSmart. All rights reserved.</p>
                </td>
              </tr>
              <tr>
                <td style="height: 80px;">&nbsp;</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      <!--/100% body table-->
    </body>
    </html>
  `;

  // Enhanced development logging with preview
  if (process.env.NODE_ENV === "development") {
    console.log("=".repeat(80));
    console.log(`📧 EMAIL PREVIEW (Development Mode)`);
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
    console.log("From:", process.env.GMAIL_USER || "not-configured");
    console.log("Subject:", subject);
    console.log("-".repeat(80));
    console.log("Verification URL:");
    console.log(verificationUrl);
    console.log("-".repeat(80));
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
    <html lang="en-US">
    <head>
      <meta content="text/html; charset=utf-8" http-equiv="Content-Type" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your Password - EduSmart</title>
      <style type="text/css">
        @import ur[](https://fonts.googleapis.com/css?family=Rubik:300,400,500,700|Open+Sans:300,400,600,700);
        body { margin: 0px; background-color: #f2f3f8; font-family: 'Open Sans', sans-serif; }
        table { border-collapse: collapse; }
        a:hover { text-decoration: underline !important; }
        .button { text-decoration: none !important; font-weight: 500; color: #fff; text-transform: uppercase; font-size: 14px; padding: 10px 24px; display: inline-block; border-radius: 50px; }
        .info-box { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 3px; }
        ul { margin: 10px 0; padding-left: 20px; }
        @media only screen and (max-width: 600px) {
          .content { padding: 0 20px !important; }
          h1 { font-size: 24px !important; }
        }
      </style>
    </head>
    <body style="margin: 0px; background-color: #f2f3f8;">
      <!--100% body table-->
      <table cellspacing="0" border="0" cellpadding="0" width="100%" bgcolor="#f2f3f8">
        <tr>
          <td>
            <table style="background-color: #f2f3f8; max-width: 670px; margin: 0 auto;" width="100%" border="0" align="center" cellpadding="0" cellspacing="0">
              <tr>
                <td style="height: 80px;">&nbsp;</td>
              </tr>
              <tr>
                <td style="text-align: center;">
                  <a href="https://edusmart.com" title="EduSmart" target="_blank">
                    <img width="60" src="https://via.placeholder.com/60x60/2c3e50/ffffff?text=ES" title="EduSmart" alt="EduSmart" style="border-radius: 50%;">
                  </a>
                </td>
              </tr>
              <tr>
                <td style="height: 20px;">&nbsp;</td>
              </tr>
              <tr>
                <td>
                  <table width="95%" border="0" align="center" cellpadding="0" cellspacing="0" style="max-width: 670px; background: #fff; border-radius: 3px; text-align: center; -webkit-box-shadow: 0 6px 18px 0 rgba(0,0,0,.06); -moz-box-shadow: 0 6px 18px 0 rgba(0,0,0,.06); box-shadow: 0 6px 18px 0 rgba(0,0,0,.06);">
                    <tr>
                      <td style="height: 40px;">&nbsp;</td>
                    </tr>
                    <tr>
                      <td class="content" style="padding: 0 35px;">
                        <h1 style="color: #2c3e50; font-weight: 500; margin: 0; font-size: 32px; font-family: 'Rubik', sans-serif;">🔑 Password Reset Request</h1>
                        <span style="display: inline-block; vertical-align: middle; margin: 29px 0 26px; border-bottom: 1px solid #cecece; width: 100px;"></span>
                        <p style="color: #455056; font-size: 15px; line-height: 24px; margin: 0;">
                          We received a request to reset the password for your EduSmart account. Click the button below to create a new password:
                        </p>

                        <div style="text-align: center; margin: 30px 0;">
                          <a href="${resetUrl}" 
                             style="background-color: #e74c3c; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                            Reset Password
                          </a>
                        </div>
                        
                        <p style="color: #7f8c8d; font-size: 14px; margin: 30px 0 0 0;">
                          If the button doesn't work, copy and paste this link into your browser:
                        </p>
                        <p style="word-break: break-all; color: #3498db; font-size: 12px; margin: 10px 0 0 0;">
                          ${resetUrl}
                        </p>
                        
                        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                        
                        <div class="info-box">
                          <p style="margin: 0; color: #856404; font-size: 14px;">
                            <strong>⚠️ Security Notice:</strong>
                          </p>
                          <ul style="margin: 10px 0; color: #856404; font-size: 13px;">
                            <li>This link will expire in <strong>1 hour</strong></li>
                            <li>This link can only be used <strong>once</strong></li>
                            <li>If you didn't request this, please ignore this email</li>
                            <li>Never share this link with anyone</li>
                          </ul>
                        </div>
                        
                        <p style="color: #95a5a6; font-size: 12px; margin: 10px 0 0 0;">
                          If you didn't request a password reset, please secure your account immediately by changing your password after logging in.
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td style="height: 40px;">&nbsp;</td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="height: 20px;">&nbsp;</td>
              </tr>
              <tr>
                <td style="text-align: center;">
                  <p style="font-size: 14px; color: rgba(69, 80, 86, 0.74); line-height: 18px; margin: 0;">&copy; ${new Date().getFullYear()} EduSmart. All rights reserved.</p>
                </td>
              </tr>
              <tr>
                <td style="height: 80px;">&nbsp;</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      <!--/100% body table-->
    </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject: "🔑 Reset Your Password - EduSmart",
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
