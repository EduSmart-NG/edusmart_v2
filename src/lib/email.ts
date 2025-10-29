import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

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
  console.log("=".repeat(80));
  console.log("EMAIL ATTEMPT");
  console.log("=".repeat(80));
  console.log("Environment:", process.env.NODE_ENV);
  console.log("To:", to);
  console.log("From:", process.env.GMAIL_USER);
  console.log("Subject:", subject);
  console.log("Gmail User Set:", !!process.env.GMAIL_USER);
  console.log("Gmail App Password Set:", !!process.env.GMAIL_APP_PASSWORD);
  console.log("-".repeat(80));

  try {
    console.log("Creating transporter...");
    const transporter = createTransporter();

    console.log("Sending email...");
    const info = await transporter.sendMail({
      from: `"EduSmart" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
    });

    console.log("Email sent successfully!");
    console.log("Message ID:", info.messageId);
    console.log("Response:", info.response);
    console.log("=".repeat(80));
  } catch (error) {
    console.error("Error sending email:");
    console.error("Error details:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    console.log("=".repeat(80));
    throw error;
  }
}

/**
 * Send email verification with consistent, mobile-optimized UI
 */
export async function sendVerificationEmail(
  email: string,
  verificationUrl: string
): Promise<void> {
  const subject = "Verify Your Email Address - EduSmart";
  const heading = "Verify Your Email Address";
  const message =
    "Thank you for registering with EduSmart. To complete your registration and start accessing our platform, please verify your email address by clicking the button below:";
  const warningMessage =
    "If you didn't create an account with EduSmart, please ignore this email.";
  const icon = "Email Verification";

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

                        <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" 
                 style="background-color: #27ae60; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Verify Email Address
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
                          This verification link will expire in 24 hours.
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
    subject,
    html,
  });
}

/**
 * Send password reset email with secure token link and consistent UI
 */
export async function sendPasswordResetEmail(
  email: string,
  resetUrl: string
): Promise<void> {
  const subject = "Reset Your Password - EduSmart";
  const heading = "Password Reset Request";
  const message =
    "We received a request to reset the password for your EduSmart account. If you didn't make this request, you can safely ignore this email.";
  const icon = "Password Reset";

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
                        <p style="color: #455056; font-size: 15px; line-height: 24px; margin: 0;">
                          ${message}
                        </p>
                        <p style="color: #455056; font-size: 15px; line-height: 24px; margin: 16px 0 0;">
                          To reset your password, click the button below:
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
                            <strong>Security Notice:</strong>
                          </p>
                          <ul style="margin: 10px 0; color: #856404; font-size: 13px;">
                            <li>This link will expire in <strong>1 hour</strong></li>
                            <li>This link can only be used <strong>once</strong></li>
                            <li>If you didn't request this, please ignore this email</li>
                            <li>Never share this link with anyone</li>
                          </ul>
                        </div>
                        
                        <p style="color: #95a5a6; font-size: 12px; margin: 10px 0 0 0;">
                          If you didn't request a password reset, please secure your account immediately by changing your password after logging in, or contact our support team.
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
    subject,
    html,
  });
}
