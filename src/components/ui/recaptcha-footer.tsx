import Link from "next/link";

const RecaptchaFooter = () => {
  return (
    <div
      className="recaptcha-notice text-center"
      style={{
        fontSize: "0.875rem",
        color: "#666",
        marginTop: "2rem",
      }}
    >
      This site is protected by reCAPTCHA and the Google{" "}
      <Link
        href="https://policies.google.com/privacy"
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:text-primary/50"
      >
        Privacy Policy
      </Link>{" "}
      and{" "}
      <Link
        href="https://policies.google.com/terms"
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:text-primary/50"
      >
        Terms of Service
      </Link>{" "}
      apply.
    </div>
  );
};

export default RecaptchaFooter;
