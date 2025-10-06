import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface TwoFactorOTPEmailProps {
  otp: string;
  userName?: string;
  expiresInMinutes?: number;
}

export function TwoFactorOTPEmail({
  otp,
  userName,
  expiresInMinutes = 3,
}: TwoFactorOTPEmailProps) {
  const previewText = `Your EduSmart verification code is ${otp}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoContainer}>
            <Img
              src={`${process.env.NEXT_PUBLIC_APP_URL}/logo.png`}
              width="120"
              height="40"
              alt="EduSmart"
              style={logo}
            />
          </Section>

          <Heading style={heading}>Two-Factor Authentication</Heading>

          {userName && <Text style={paragraph}>Hi {userName},</Text>}

          <Text style={paragraph}>
            Someone is trying to sign in to your EduSmart account. To complete
            the sign-in process, please enter the following verification code:
          </Text>

          <Section style={otpContainer}>
            <Text style={otpText}>{otp}</Text>
          </Section>

          <Text style={paragraph}>
            This code will expire in <strong>{expiresInMinutes} minutes</strong>
            .
          </Text>

          <Section style={warningContainer}>
            <Text style={warningTitle}>⚠️ Security Alert</Text>
            <Text style={warningText}>
              If you didn&apos;t attempt to sign in, someone may be trying to
              access your account. Please secure your account immediately by
              changing your password.
            </Text>
            <Link
              href={`${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings`}
              style={warningLink}
            >
              Change Password Now
            </Link>
          </Section>

          <Text style={footerText}>
            This email was sent by EduSmart. If you have questions, contact us
            at{" "}
            <Link href="mailto:support@edusmart.com" style={link}>
              support@edusmart.com
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default TwoFactorOTPEmail;

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
  maxWidth: "560px",
};

const logoContainer = {
  padding: "32px 20px",
  textAlign: "center" as const,
};

const logo = {
  margin: "0 auto",
};

const heading = {
  fontSize: "24px",
  letterSpacing: "-0.5px",
  lineHeight: "1.3",
  fontWeight: "600",
  color: "#484848",
  padding: "17px 0 0",
  textAlign: "center" as const,
};

const paragraph = {
  margin: "0 0 15px",
  fontSize: "15px",
  lineHeight: "1.4",
  color: "#3c4149",
  padding: "0 20px",
};

const otpContainer = {
  background: "#f4f4f4",
  borderRadius: "8px",
  margin: "32px 20px",
  padding: "24px",
  textAlign: "center" as const,
};

const otpText = {
  fontSize: "36px",
  fontWeight: "700",
  color: "#22c55e",
  letterSpacing: "8px",
  margin: "0",
  fontFamily: "monospace",
};

const warningContainer = {
  background: "#fef2f2",
  border: "1px solid #fecaca",
  borderRadius: "8px",
  margin: "24px 20px",
  padding: "20px",
};

const warningTitle = {
  fontSize: "16px",
  fontWeight: "600",
  color: "#991b1b",
  margin: "0 0 8px",
};

const warningText = {
  fontSize: "14px",
  lineHeight: "1.4",
  color: "#7f1d1d",
  margin: "0 0 12px",
};

const warningLink = {
  color: "#dc2626",
  textDecoration: "underline",
  fontSize: "14px",
  fontWeight: "600",
};

const footerText = {
  fontSize: "12px",
  lineHeight: "1.4",
  color: "#8898aa",
  padding: "0 20px",
  marginTop: "24px",
  textAlign: "center" as const,
};

const link = {
  color: "#22c55e",
  textDecoration: "underline",
};
