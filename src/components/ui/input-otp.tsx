import React from "react";

type OTPInputProps = {
  length?: number;
  onComplete?: (otp: string) => void;
  autoFocus?: boolean;
  disabled?: boolean;
  value?: string;
  onChange?: (value: string) => void;
};

const OTPInput: React.FC<OTPInputProps> = ({
  length = 6,
  disabled = false,
  autoFocus = true,
  value = "",
  onChange,
}) => {
  const [otp, setOTP] = React.useState<string[]>(
    value ? value.split("") : new Array(length).fill("")
  );
  const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

  if (inputRefs.current.length !== length) {
    inputRefs.current = new Array(length).fill(null);
  }

  const focusInput = React.useCallback((index: number) => {
    if (inputRefs.current[index]) {
      inputRefs.current[index]?.focus();
    }
  }, []);

  const handleChange = React.useCallback(
    (index: number, value: string) => {
      const newOTP = [...otp];
      newOTP[index] = value.slice(-1);
      setOTP(newOTP);

      const otpString = newOTP.join("");
      onChange?.(otpString);

      if (value && index < length - 1) {
        focusInput(index + 1);
      }
    },
    [otp, length, onChange, focusInput]
  );

  const handleKeyDown = React.useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace" && !otp[index] && index > 0) {
        e.preventDefault();
        const newOTP = [...otp];
        newOTP[index - 1] = "";
        setOTP(newOTP);
        onChange?.(newOTP.join(""));
        focusInput(index - 1);
      } else if (e.key === "ArrowLeft" && index > 0) {
        e.preventDefault();
        focusInput(index - 1);
      } else if (e.key === "ArrowRight" && index < length - 1) {
        e.preventDefault();
        focusInput(index + 1);
      }
    },
    [otp, length, onChange, focusInput]
  );

  const handlePaste = React.useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pastedData = e.clipboardData.getData("text/plain").slice(0, length);
      const newOTP = [...otp];

      for (let i = 0; i < pastedData.length; i++) {
        if (i < length) {
          newOTP[i] = pastedData[i];
        }
      }

      setOTP(newOTP);
      onChange?.(newOTP.join(""));

      const nextEmptyIndex = newOTP.findIndex((value) => !value);
      focusInput(nextEmptyIndex !== -1 ? nextEmptyIndex : length - 1);
    },
    [otp, length, onChange, focusInput]
  );

  return (
    <div
      className="flex gap-2 sm:gap-4 justify-center items-center w-full"
      role="group"
      aria-label="OTP input"
    >
      {otp.map((digit, index) => (
        <input
          key={index}
          ref={(element: HTMLInputElement | null) => {
            inputRefs.current[index] = element;
          }}
          type="text"
          inputMode="numeric"
          pattern="\d*"
          maxLength={1}
          value={digit}
          disabled={disabled}
          autoFocus={autoFocus && index === 0}
          className={`w-12 h-10 sm:w-14 sm:h-12 text-2xl text-center border rounded-sm focus:outline-none focus:border-green-700 disabled:bg-gray-100 disabled:cursor-not-allowed ${
            disabled ? "border-gray-200" : "border-gray-300"
          }`}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={index === 0 ? handlePaste : undefined}
          aria-label={`Digit ${index + 1} of ${length}`}
        />
      ))}
    </div>
  );
};

export default OTPInput;
