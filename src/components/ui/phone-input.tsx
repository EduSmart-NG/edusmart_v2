import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { countries } from "@/lib/utils/countries";

function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

interface PhoneInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  className?: string;
  value?: string;
  onChange?: (value: string) => void;
  defaultCountry?: string;
}

function PhoneInput({
  className,
  value = "",
  onChange,
  defaultCountry = "NG",
  ...props
}: PhoneInputProps) {
  const [selectedCountry, setSelectedCountry] = React.useState(defaultCountry);
  const [phoneNumber, setPhoneNumber] = React.useState("");

  const currentCountry =
    countries.find((c) => c.code === selectedCountry) || countries[0];

  // Initialize phone number from value prop
  React.useEffect(() => {
    if (value) {
      // Extract phone number without dial code
      const country = countries.find((c) => value.startsWith(c.dialCode));
      if (country) {
        setSelectedCountry(country.code);
        setPhoneNumber(value.substring(country.dialCode.length));
      } else {
        setPhoneNumber(value);
      }
    }
  }, [value]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setPhoneNumber(newValue);
    if (onChange) {
      onChange(`${currentCountry.dialCode}${newValue}`);
    }
  };

  const handleCountryChange = (countryCode: string) => {
    setSelectedCountry(countryCode);
    const newCountry = countries.find((c) => c.code === countryCode);
    if (onChange && newCountry) {
      onChange(`${newCountry.dialCode}${phoneNumber}`);
    }
  };

  return (
    <div className="flex gap-2 w-full">
      <SelectPrimitive.Root
        value={selectedCountry}
        onValueChange={handleCountryChange}
      >
        <SelectPrimitive.Trigger
          className={cn(
            "border-input data-[placeholder]:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-green-700 focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 dark:hover:bg-input/50 flex items-center justify-between gap-2 rounded-md border bg-transparent px-4 py-3 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
          )}
        >
          <div className="flex items-center gap-2">
            <span className="text-xl leading-none">{currentCountry.flag}</span>
            <span className="text-sm">{currentCountry.dialCode}</span>
          </div>
          <SelectPrimitive.Icon asChild>
            <ChevronDownIcon className="size-4 opacity-50" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>

        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            className={cn(
              "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 relative z-50 max-h-[300px] min-w-[200px] overflow-hidden rounded-md border shadow-md"
            )}
            position="popper"
          >
            <div className="flex cursor-default items-center justify-center py-1">
              <ChevronUpIcon className="size-4" />
            </div>
            <SelectPrimitive.Viewport className="p-1">
              {countries.map((country) => (
                <SelectPrimitive.Item
                  key={country.code}
                  value={country.code}
                  className={cn(
                    "focus:bg-accent focus:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                  )}
                >
                  <span className="absolute right-2 flex size-3.5 items-center justify-center">
                    <SelectPrimitive.ItemIndicator>
                      <CheckIcon className="size-4" />
                    </SelectPrimitive.ItemIndicator>
                  </span>
                  <SelectPrimitive.ItemText>
                    <div className="flex items-center gap-2">
                      <span className="text-xl leading-none">
                        {country.flag}
                      </span>
                      <span className="text-sm">{country.dialCode}</span>
                      <span className="text-muted-foreground text-xs">
                        {country.name}
                      </span>
                    </div>
                  </SelectPrimitive.ItemText>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
            <div className="flex cursor-default items-center justify-center py-1">
              <ChevronDownIcon className="size-4" />
            </div>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>

      <input
        type="tel"
        value={phoneNumber}
        onChange={handlePhoneChange}
        placeholder="803XXXXXXX"
        className={cn(
          "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex w-full min-w-0 rounded-md border bg-transparent px-4 py-3 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          "focus-visible:border-green-700 focus-visible:ring-ring/50",
          "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
          className
        )}
        {...props}
      />
    </div>
  );
}

export default PhoneInput;
