import { Resend } from "resend";

// Initialize Resend with API key (works in both dev and prod)
const resend = new Resend(process.env.RESEND_API_KEY || "re_development_key");

interface EmailParams {
  to: string;
  subject: string;
  html: string;
}

async function sendEmail({ to, subject, html }: EmailParams): Promise<void> {
  // Log to console in development mode
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

  // Send actual email in production
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
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f4f4f4; padding: 20px; border-radius: 10px;">
          <h1 style="color: #2c3e50; text-align: center;">Welcome to EduSmart!</h1>
          
          <div style="background-color: white; padding: 30px; border-radius: 5px; margin-top: 20px;">
            <h2 style="color: #27ae60;">Verify Your Email Address</h2>
            
            <p>Thank you for registering with EduSmart. To complete your registration and start accessing our platform, please verify your email address by clicking the button below:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" 
                 style="background-color: #27ae60; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Verify Email Address
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
              If you didn't create an account with EduSmart, please ignore this email.
            </p>
            
            <p style="color: #95a5a6; font-size: 12px;">
              This verification link will expire in 24 hours.
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
    subject: "Verify Your Email Address - EduSmart",
    html,
  });
}
